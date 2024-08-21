//X CLOSEING POOVERS ON CALENDAR XMLHttpRequestUpload
//EVENT WINDOW ALLOWED OUT OF BUSINESS getHours
//ACTIVITY CHECKBOXES NOT REFRESHING QUICK ENOUGH
// IF I WANT TO LOCK RESOURCES FOR USERS, WILL NEED TO SEND THE USERS RESOURCES


/** EVENT MODEL ******************************************
 *  https://fullcalendar.io/docs/event-model
 * 
 * eventDataTransform()
 * defaultAllDay: false
 * defaultAllDayEventDuration
 * defaultTimedEventDuration
 * forceEventDuration: true
 * 
 * calendar.addEvent(event, sourceID)
 * 
 * CALLBACKS
 * eventAdd()
 * eventChange()
 * eventRemove()
 * 
 */

function eventDataTransform(eventData) {
  //TRANSFORM eventSourceSuccess ARRAY ITEM TO PARSABLE EVENT OBJECT
  //NOT CONVERTED TO EVENT OBJECT YET
//  const { constraint } = SETTINGS.SOURCES[index];
  const FIELDS = SETTINGS.QUERY.fields;

  /*  IF USER:
        AND BUSINESS HOURS; 
          CALENDAR.EVENTCONSTRAINT = BUSINESSHOURS (CHECK AGAINST EVENT.CONSTRAINT)
          CALENDAR.SELECTCONSTRAINT = BUSINESSHOURS (CHECK AGAINST EVENT.CONSTRAINT)
          SOURCE/EVENT.CONSTRAINT = {OPEN, CLOSE}

        NOT BUSINESSHOURS;
          CALENDAR.EVENTCONSTRAINT = {OPEN, CLOSE}
          CALENDAR.SELECTCONSTRAINT = {OPEN, CLOSE}
      IF NOT USER:
        BUSINESSHOURS = FALSE
        CALENDAR.EVENTCONSTRAINT = {START, END}
        CALENDAR.SELECTCONSTRAINT = {START, END}
   */

  let event = {};
  for (const key in FIELDS) {
    event[key] = eventData.fieldData[FIELDS[key]];
  }
  if ( !event.title ) event.title = event.name;

  // UPDATE TEXT DATES TO DATE OBJECTS
  event.start = getDate(event.start);
  event.end = getDate(event.end);

//  event.constraint = constraint;

  if (Array.isArray(eventData.portalData[FIELDS._resourcesPortal])) {
    event.resourceIds = eventData.portalData[FIELDS._resourcesPortal].map((row) => (
      row[FIELDS.resourceId]
    )
    );
    event.resources = eventData.portalData[FIELDS._resourcesPortal].map((row) => ({
      uuid: row[FIELDS.resourceId],
      title: row[FIELDS.resource]
    })
  );

  };
  event.resourceIds.push(SETTINGS.CALENDAR.id);

  let users = [
    event.creator,
    event.person,
    event.supervisor
  ];

//  let validStart = isEventAfterStart({ ...event, constraint: constraint });
//  let validEnd = isEventBeforeEnd({ ...event, constraint: constraint });
//  let validStart = isEventAfterStart(event);
//  let validEnd = isEventBeforeEnd(event);

  event.editable = calendar.getOption('editable') && isEventAfterStart(event).response && isEventBeforeEnd(event).response && (users.includes(SETTINGS.USER.id) || SETTINGS.USER.access == "admin") &&
    ( event.status != EVENT_STATUS.canceled );


//    console.log(event.editable);
  return formatEvent(event);
}

function eventAdd(eventInfo) {
  // { event, relatedEvents, revert }
  // SAVE eventInfo to hear callback from FM?
  SETTINGS._EVENT = eventInfo;
  // Triggered from Events:newEvent
  // VERIFY EVENT AND REVERT()
  //  eventInfo.revert();
  let event = eventInfo.event.toPlainObject();
  /**
   * WILL REFETCH EVENTS ANYWAY, SO DISAPEARS IF NOT ADDED IN FM
   */
//  calendar.unselect();
  let notify = SETTINGS.USER.id != eventInfo.event.extendedProps.person;
  // CALLBACK FILEMAKER WITH ERROR MESSSAGE? COMMIT OR NOT COMMIT?
  let param = {
    method: API + ".newEvent",
    config: { webviewer: WEBVIEWER, function: "refetchEvents" },
    data: {
      event: {
        ...event, start: getTimestampString(event.start), end: getTimestampString(event.end),
        person: SETTINGS.USER.id, source: eventInfo.event.source.id, notify : notify
      }
    },
  };
  FileMaker.PerformScriptWithOption(
    SCRIPT,
    JSON.stringify(param),
    5
  );

}
function eventChange(eventInfo) {
  //https://fullcalendar.io/docs/eventChange
  SETTINGS._EVENT = eventInfo;

  if (SETTINGS.USER.id != eventInfo.event.extendedProps.person) {
    //CREATE MODAL CONFIRMATION
//    let event = eventInfo.event;
    eventInfo.title = "Confirm Update";
    eventInfo.close = `onclick="eventUpdated(false)"`;
    eventInfo.footer = `
      <button type="button" onclick="eventUpdated(false)" class="btn btn-warning" data-bs-dismiss="modal">Cancel</button>
      <button type="button" onclick="updateEvent('${eventInfo.event.id}',true)" class="btn btn-secondary" data-bs-dismiss="modal">Confirm and Notify</button>
      <button type="button" onclick="updateEvent('${eventInfo.event.id}')" class="btn btn-primary" data-bs-dismiss="modal">Confirm</button>`;

    
    showModal(eventInfo);
  } else {
    updateEvent(eventInfo.event.id);
  }
};
function eventRemove(eventInfo) {
  //REMOVE EVENT
  let notify = SETTINGS.USER.id != eventInfo.event.extendedProps.person;

  let param = {
    method: API + ".eventRemove",
    config: { webviewer: WEBVIEWER, function: "" },
    data: { event: eventInfo.event, notify: notify },
  };
  FileMaker.PerformScriptWithOption(
    SCRIPT,
    JSON.stringify(param),
    5
  );
};


/** EVENT MODEL ******************************************
 *  https://fullcalendar.io/docs/event-source
 * 
 * events()
 * eventSources
 * eventSourceSuccess
 * eventSourceFailure
 * initialEvents
 * 
 * loading()
 * 
 */

async function events(fetchInfo, successCallback, failureCallback) {

  let result = await fetchEvents(fetchInfo);

  if (result.messages[0].code == 0) {
    successCallback(result);
  } else if (result.messages[0].code == 401) {
      //  OK, records not found
    failureCallback();
  } else {
    //  ISSUE WARNING LOG
    failureCallback(result.messages[0]);
  }
}
function eventSourceSuccess(rawEvents, response) {
  return rawEvents.response.data;
}
function eventSourceFailure(messages) { }
function loading(isLoading) {



  let content = `
    <div class="toast-body d-flex justify-content-between">
      <div>Loading Events...</div>
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>`;

  let element;
  if (document.getElementById("loading")) {
    element = document.getElementById("loading");
  } else {
    parent = document.createElement("div");
    parent.setAttribute("class", "toast-container top-50 start-50 translate-middle p-3");

    element = document.createElement("div");
    element.setAttribute("id", "loading");
    element.setAttribute("class", "toast align-items-center bg-default");
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
    element.setAttribute("aria-atomic", "true");
    element.setAttribute("data-bs-autohide", "false");
    element.innerHTML = content;

    parent.appendChild(element);
    document.body.appendChild(parent);
  }

  let toast = bootstrap.Toast.getOrCreateInstance(element);
  if (!isLoading) toast.hide();
  else toast.show();
}


/** EVENT DISPLAY ******************************************
 *  https://fullcalendar.io/docs/event-display
 * 
 * 
 * 
 */

function eventDidMount(arg) {
  // {event, timeText, isStart, isEnd, isMirror, isPast, isFuture, isToday, el, view}
  if (arg.isMirror) {
    return true;
  }
  //CORRECT BACKGROUND TEXT COLORS
  if (arg.event.textColor && arg.event.display == "background") {
    arg.el.style.color = arg.event.textColor;
  }
  createPopover(arg);
};


/** DATE CLICKING AND SELECTING ******************************************
 * https://fullcalendar.io/docs/date-clicking-selecting
 * 
 * selectable: true
 * selectMirror: true
 * unselectAuto: true
 * unselectCancel: null
 * selectOverlap()
 * selectConstraint: {start:start,end:open}
 *    set to "businessHours" if businessHours are set and userAccess=="user"
 *    set to {start:close, end: open} for userAccess=="user" and !businessHours
 * selectAllow()
 *    {start: SETTINGS.calendar.start, end: SETTINGS.calendar.end} all access
 *    {start: SETTINGS.calendar.close, end: SETTINGS.calendar.open} user access
 *    SETTINGS.calendar.start: 
 *    SETTINGS.calendar.end: 
 *    SETTINGS.calendar.close:
 *    SETTINGS.calendar.open:
 *    SETTINGS.USER.id:
 *    SETTINGS.USER.access:
 * selectMinDistance: 5
 * 
 * dateClick()
 * select()
 * unselect()
 * 
 */

function selectOverlap(event) {
  // NOT WORKING IN SCHEDULER
  // SENT SERIALLY FOR EACH OVERLAPPING EVENT
  if (event.extendedProps.status == "Support") {
    toaster("Warning: Overlapping support reservation");
  }
  if (event.extendedProps.status == "Shutdown") {
    //!!! CHECK IF SHUTDOWN EVENT RESOURCES IS NULL OR FOR SPECIFIC RESOURCE
  }

  return event.extendedProps.status != "Shutdown";
}
function selectAllow(selectionInfo) {
  // { start, end, startStr, endStr, allDay, resource }

  let newEvent = selectionInfo;
  newEvent.extendedProps = { person: SETTINGS.USER.id };
//  if ( !newEvent.resource ) {
//    newEvent.resource = { id : SETTINGS.CALENDAR.id }
//  }

  // IF SELECT CONSTRAINT IS BUSINESS HOURS AND EVENTCONSTRAINT IS BUSINESS HOURS... NEEDS EVENT.CONSTRAINT
  // WHAT TO USE FOR EVENT.CONSTRAINT ON NEW EVENTS ?? SETTINGS.SOURCES[0].constraint
  // CREATE A RESERVATION EVENT FROM {OPEN, CLOSE} AS INVERSE BACKGROUND WITH GROUPID "Reservations" ?
  // NEW EVENT CONSTRAINT IS "RESERVATIONS"
  // IF SELECT OVERLAP DOESN'T OVERLAP "RESERVATIONS"?
  let result = isValid(newEvent);
  if (!result.response) {
    toaster(result.message);
    return false;
  }

  if (document.getElementById("warning")) bootstrap.Toast.getOrCreateInstance(document.getElementById("warning")).hide();
  return true;
}
function dateClick(selectionInfo) {
  // {date, dateStr, allDay, dayEl, jsEvent, view, resource*}
  //https://fullcalendar.io/docs/dateClick

  // TURN OFF DATECLICK IF NOT SELECTABLE
  if (calendar.getOption("selectable") == false) return false;
  
  let newEvent = selectionInfo;
  let today = new Date();
  let start = new Date(newEvent.date);
//  if ( !newEvent.resource ) {
//    newEvent.resource = { id : SETTINGS.CALENDAR.id }
//  }
//console.log(selectionInfo);
  if (newEvent.allDay == true) start.setHours(today.getHours() + 1, 0, 0, 0);
  let end = new Date(start);
  //NEW EVENT for day at current time for 1 hour
  end.setHours(start.getHours() + 1, start.getMinutes(), 0, 0);
//  console.log(start);
//  console.log(end);
  // WOULD NEED TO GENERATE TIME IN BUSINESSHOURS ??? 
  // WOULD NEED TO CHECK MIN AND MAX ??? AND USERHOURS AND MAXUSERS
  newEvent.start = start;
  newEvent.end = end;
  createEvent(newEvent);
};
function select(selectionInfo) {
  // {start, end, startStr, endStr, allDay, jsEvent, view, resource*}
  //https://fullcalendar.io/docs/select-callback

  createEvent(selectionInfo);
};


/** EVENT CLICKING AND HOVERING *****************************************
 * https://fullcalendar.io/docs/event-clicking-hovering
 * 
 * eventClick
 * eventMouseEnter
 * eventMouseLeave
 * 
 */

function eventClick(eventInfo) {
  //DISMISS POPOVER
  bootstrap.Popover.getInstance(eventInfo.el).hide();

  eventInfo.title = eventInfo.event.title;
  eventInfo.footer = eventInfo.event.startEditable || eventInfo.event.durationEditable ? `
    <button id="eventDelete" onclick="deleteEvent('${eventInfo.event.id}')" type="button" class="btn btn-danger" data-bs-dismiss="modal">Delete</button>
    <button id="eventEdit" onclick="viewEvent('${eventInfo.event.id}')" type="button" class="btn btn-primary" data-bs-dismiss="modal">Edit</button>
  ` : "";

  showModal(eventInfo);
}
function eventMouseEnter(mouseEnterInfo) { };
function eventMouseLeave(eventInfo) { };


/** EVENT DRAGGING AND RESIZING *****************************************
 * https://fullcalendar.io/docs/event-dragging-resizing
 * 
 * editable
 * eventStartEditable
 * eventResizableFromStart
 * eventDurationEditable
 * eventResourceEditable
 * 
 * eventDragMinDistance
 * dragReverDuration
 * dragScroll
 * snapDuration
 * allDayMaintainDuration
 * fixedMirrorParent
 * 
 * eventOverlap()
 * eventConstraint{}
 * eventAllow()
 * 
 * eventDragStart
 * eventDragStop
 * eventDrop [eventChange]
 * eventResizeStart
 * eventResizeStop
 * eventResize [eventChange] [revert]
 * 
 */

function eventOverlap(stillEvent, movingEvent) {
  // https://fullcalendar.io/docs/eventOverlap
  // movingEvent start and end not yet updated
  // called on each event, doesn't provide list of all overlapping events
  if (stillEvent.extendedProps.status == "Support") {
    toaster("Warning: Overlapping support reservation");
  }

  if (stillEvent.extendedProps.status == "Shutdown" && movingEvent.extendedProps.status != "Support") {
    // !!! CHECK IF STILL.SHUTDOWN RESOURCE IS ON AN MOVINGEVENT OR NULL
    toaster("Cannot overlap shutdown reservation");
    return false;
  }

  return true;
};
function eventAllow(dropInfo, draggedEvent) {

//  console.log("EventAllow");
  var newEvent = draggedEvent.toPlainObject();
  newEvent.start = new Date(dropInfo.start);
  newEvent.end = new Date(dropInfo.end);

  // DOES PLAIN OBJECT RETRAIN CONSTRAINT??
  let result = isValid(newEvent);
//  console.log(result);
  if (!result.response) {
    toaster(result.message);
    return false;
  }

  if (document.getElementById("warning")) bootstrap.Toast.getOrCreateInstance(document.getElementById("warning")).hide();
  return true;
};

function eventDragStop(changeInfo) {
  if (document.getElementById("warning")) {
    element = document.getElementById("warning");
    let toast = bootstrap.Toast.getOrCreateInstance(element);
    if (toast.isShown()) toast.hide();
  }
}
function eventResizeStop(changeInfo) {
  if (document.getElementById("warning")) {
    element = document.getElementById("warning");
    let toast = bootstrap.Toast.getOrCreateInstance(element);
    if (toast.isShown()) toast.hide();
  }
}




function eventContent(arg) {

  let event = arg.event;
  let title = event.title;
  if (event.extendedProps.status === "Shutdown") {
    title = `<div class="reservation-title small">${event.extendedProps.notes}</div>`;;
  } else {
    title = `<div class="reservation-title">${title}</div>`;
  }
  let edit = event.startEditable || event.durationEditable ? `
  <i class="bi bi-pencil-fill"></i>` : "";

  let resources = "";
  if (event.extendedProps?.resources?.length ?? false) {
    event.extendedProps.resources.forEach((resource) => {
      resources += `<li>${resource.title}</li>`;
    });
    resources = `<div class="mt-1 pr-2 small">Resources:
    <ul>${resources}</ul></div>`;
  };
  /*
    if (arg.view.type === "dayGridMonth") {
      /*
      <div class="fc-daygrid-event-dot" style="border-color: rgb(0, 119, 200);"></div>
      <div class="fc-event-time">5p</div>
      <div class="fc-event-title">Hiebert, Doug</div>
  
      <div class="fc-event-main-frame"><div class="fc-event-time">12a</div>
        <div class="fc-event-time">${arg.timeText}</div>
        <div class="fc-event-title-container">
          <div class="fc-event-title fc-sticky d-flex justify-content-between">${title}</div>
        </div>
      </div>
  
  
      timgridWeek
  
      <div class="fc-event-main" style="color: black;">
        <div class="fc-event-main-frame">
          <div class="fc-event-time">${arg.timeText}</div>
          <div class="fc-event-title-container">
            <div class="fc-event-title fc-sticky">${title}</div>
          </div>
        </div>
      </div>
      <div class="fc-event-resizer fc-event-resizer-start"></div>
      <div class="fc-event-resizer fc-event-resizer-end"></div>
      
  
  
      let edit = event.startEditable || event.durationEditable ? `
        <i class="bi bi-pencil-fill"></i>` : "";
      let title = `
          <div>${event.title}</div>
          <div class="px-2"></div>
          <div>${edit}</div>`;
  
      /*
          let content = `
            <div class="fc-event-main" style"color: white;">
              <div class="fc-event-main-frame">
                <div class="fc-daygrid-event-dot" style="border-color: rgb(0, 119, 200);"></div>
                <div class="fc-event-time">${arg.timeText}</div>
                <div class="fc-event-title-container">
                  <div class="fc-event-title fc-sticky">${title}</div>
                </div>
              </div>
            </div>`;
      
      let content = `
        <div class="fc-event-main-frame">
        <div class="fc-daygrid-event-dot"></div>
        <div class="fc-event-time">${arg.timeText}</div>
  
          <div class="fc-event-title fc-sticky d-flex justify-content-between">${title}</div>
  
      </div>`;
  
      return true;
    } 
  */
  if (arg.view.type == "timeGridWeek" || arg.view.type == "timeGridDay") {
    // ADD ACTIVITIES TO EVENT BODY
    //    let event = arg.event;

    const templateNormal = `
      <div class="reservation-contents px-2 pt-1 align-items-center">
        <div class="fc-event-time">${arg.timeText}</div>
        <div class="reservation-item reservation-status d-flex flex-row">
          ${title}
          <div class="reservation-icon ms-auto">${edit}</div>
        </div>
        ${resources}
      </div>
    `;
    return { html: templateNormal };

  }

  return true;
}




/*

function eventContent(arg, factory) {
  let timeText = arg.timeText;
  let title = arg.event.title;
  let resources = arg.event.extendedProps.resources ? arg.event.extendedProps.resources : [];
  let activitiesText = "";
  let editIcon = "";

  if (arg.view.type === "timeGridWeek") {
    if (arg.event.startEditable || arg.event.durationEditable) {
      editIcon = `<i title="Editable"class="bi bi-pencil-fill"></i>`;
    };
    if (resources !== 0) {
      resources.forEach((element) => {
        activitiesText += `<li>${element.title}</li>`;
      });
    };

    const templateNormal = `
<div class="reservation-contents px-2 pt-1 align-items-center">
  <div class="reservation-item reservation-status d-flex flex-row">
    <div class="reservation-title">${title}</div>
    <div class="reservation-icon ms-auto">${editIcon}</div> 
  </div>
  <div class="reservation-datetime mt-1">${timeText}</div>
  <div class="activities mt-2">
    <ul>${activitiesText}</ul>
  </div>
</div>
`;
    //console.log(templateNormal);
    //console.log(arg.event);
    return { html: templateNormal };

  } else if (arg.view.type === "dayGridMonth") {
    if (arg.event.startEditable || arg.event.durationEditable) {
      editIcon = `<i title="Editable"class="bi bi-pencil-fill"></i>`;
    };
    let content = `
    <div class="fc-event-main" style"color: white;">
      <div class="fc-event-main-frame">
        <div class="fc-event-time">${timeText}</div>
        <div class="fc-event-title-container">
          <div class="fc-event-title fc-sticky">${title}</div>
        </div>
      </div>
    </div>
    `;
    return true; { html: content }; //factory("i", {class : "bi bi-pencil-fill" }, ""); //
  };


  return true;


  return true;
  if (activities.length !== 0) {
    activities.forEach((element) => {
      activitiesText += `<li>${element}</li>`;
    });
  }



  const templateShutdown = `
    <div class="reservation-contents px-2 pt-1 align-items-center">
      <div class="reservation-item reservation-status d-flex flex-row">
        <div class="reservation-title">${event.extendedProps.notes}</div>
      </div>
    </div>
  `;

  if (event.extendedProps.status === "Shutdown") {
    return { html: templateShutdown };
  }

  return { html: templateNormal };
};
*/