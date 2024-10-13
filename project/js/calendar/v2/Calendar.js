
//EVENT WINDOW ALLOWED OUT OF BUSINESS getHours
//ACTIVITY CHECKBOXES NOT REFRESHING QUICK ENOUGH
// IF I WANT TO LOCK RESOURCES FOR USERS, WILL NEED TO SEND THE USERS RESOURCES


/** DATE CLICKING & SELECTING *****************************************
 * https://fullcalendar.io/docs/date-clicking-selecting
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

  let result = isValid(newEvent);
  if (!result.response) {
    toaster(result.message);
    return false;
  }

  if (document.getElementById("warning")) bootstrap.Toast.getOrCreateInstance(document.getElementById("warning")).hide();
  return true;
}
function dateClick(selectionInfo) {
  // TURN OFF DATECLICK IF NOT SELECTABLE
  if (calendar.getOption("selectable") == false) return false;
  
  let newEvent = selectionInfo;
  let today = new Date();
  let start = new Date(newEvent.date);

  if (newEvent.allDay == true) start.setHours(today.getHours() + 1, 0, 0, 0);
  let end = new Date(start);
  //NEW EVENT for day at current time for 1 hour
  end.setHours(start.getHours() + 1, start.getMinutes(), 0, 0);
  newEvent.start = start;
  newEvent.end = end;

  //NEW EVENT VERIFIED IN createEvent
  createEvent(newEvent);
};
function select(selectionInfo) {
  // {start, end, startStr, endStr, allDay, jsEvent, view, resource*}
  //https://fullcalendar.io/docs/select-callback

  //NEW EVENT VERIFIED IN createEvent
  createEvent(selectionInfo);
};


/** EVENT MODEL ******************************************
 *  https://fullcalendar.io/docs/event-model
 */

function eventDataTransform(eventData) {
  //NOT CONVERTED TO EVENT OBJECT YET
  const FIELDS = SETTINGS.QUERY.fields;

  let event = {};
  for (const key in FIELDS) {
    event[key] = eventData.fieldData[FIELDS[key]];
  }
  if ( !event.title ) event.title = event.name;

  // UPDATE TEXT DATES TO DATE OBJECTS
  event.start = getDate(event.start);
  event.end = getDate(event.end);

  if (Array.isArray(eventData.portalData[FIELDS._resourcesPortal])) {
    event.resourceIds = eventData.portalData[FIELDS._resourcesPortal].map((row) => (
      row[FIELDS.resourceId]
    ));
    event.resources = eventData.portalData[FIELDS._resourcesPortal].map((row) => ({
      uuid: row[FIELDS.resourceId],
      title: row[FIELDS.resource]
    }));
  };
  event.resourceIds.push(SETTINGS.CALENDAR.id);
//  event.resources.push({id:SETTINGS.CALENDAR.id, title: SETTINGS.CALENDAR.title});

  let users = [
    event.creator,
    event.person,
    event.supervisor
  ];

  event.editable = calendar.getOption('editable') && isEventAfterStart(event).response && isEventBeforeEnd(event).response && (users.includes(SETTINGS.USER.id) || SETTINGS.USER.access == "admin") &&
    ( event.status != EVENT_STATUS.canceled );

  return formatEvent(event);
}

function eventAdd(eventInfo) {
  // { event, relatedEvents, revert }
  // Triggered from Events:newEvent
  let event = eventInfo.event.toPlainObject();

  // VERIFY EVENT IN FM
  // eventInfo.revert(); IF FAILS VALIDATION IN FM, NOT REFETCHED
  let param = {
    method: API + ".newEvent",
    config: { webviewer: WEBVIEWER, function: "refetchEvents" },
    data: {
      event: {
        ...event, start: getTimestampString(event.start), end: getTimestampString(event.end),
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

//  console.log(result.messages[0].code);
  if (result.messages[0].code == '0') {
    successCallback(result);
  } else if (result.messages[0].code == '401') {
    //  OK, records not found
//    console.log("Not Found");
    loading(false);
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

  //HIDE ALL POPOVERS SO THEY DON'T GET STUCK
  document.querySelectorAll('[data-bs-toggle="popover"]').forEach((el, i) => {
    //console.log(el);
    let popoverInstance = bootstrap.Popover.getOrCreateInstance(el);
    popoverInstance.hide();
  });
  
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

  // DOES PLAIN OBJECT RETAIN CONSTRAINT??
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