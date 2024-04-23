

/** EVENT MODEL******************************************
 *  https://fullcalendar.io/docs/event-model
 * 
 * eventDataTransform()
 * defaultAllDay: false
 * defaultAllDayEventDuration
 * defaultTimedEventDuration
 * forceEventDuration: true
 * 
 * CALLBACKS
 * eventAdd()
 * eventChange()
 * eventRemove()
 * 
 */

function eventDataTransform(eventData, index) {
  //TRANSFORM eventSourceSuccess ARRAY ITEM TO PARSABLE EVENT OBJECT
  //NOT CONVERTED TO EVENT OBJECT YET
//  const FIELDS = SETTINGS.event;
  const FIELDS = SETTINGS.FIELDS[index];

  let event = {};
  for (const key in FIELDS) {
    event[key] = eventData.fieldData[FIELDS[key]];
  }

  // UPDATE TEXT DATES TO DATE OBJECTS
  event.start = getDate(eventData.fieldData[FIELDS.start]);
  event.end = getDate(eventData.fieldData[FIELDS.end]);

  // PASS STATUS = EDITING WHEN ON CURRENT RECORD???
  event.resources = eventData.portalData[FIELDS._resourcesPortal].map((row) => ({
    uuid: row[FIELDS.resourceId],
    title: row[FIELDS.resource]
  })
  );

  let users = [
    event.creator,
    event.person,
    event.supervisor
  ];
  let validStart = isEventAfterStart(event);
  let validEnd = isEventBeforeEnd(event);
  //EDITABLE IF DATE > START DATE AND USER IN USERS or ADMIN
  event.editable = validStart.response && validEnd.response && ( users.includes(SETTINGS.USER.id) || SETTINGS.USER.access == "admin" ) && 
    event.status != "Canceled";

  return formatEvent(event, index);
}

function eventAdd(eventInfo){
  // CALLED AFTER EVENT ADDED TO CALENDAR
  // VERIFY EVENT AND REVERT()
  // CALLBACK FILEMAKER WITH ERROR MESSSAGE? COMMIT OR NOT COMMIT?
}
function eventChange(eventInfo) {
  //https://fullcalendar.io/docs/eventChange
  SETTINGS._EVENT = eventInfo;

  if (SETTINGS.USER.id != eventInfo.event.extendedProps.person) {
    //CREATE MODAL CONFIRMATION
    let event = eventInfo.event;
    event.title = "Confirm Update";
    event.close = `onclick="revert_EVENT()"`;
    event.footer = `
      <button type="button" onclick="revert_EVENT()" class="btn btn-warning" data-bs-dismiss="modal">Cancel</button>
      <button type="button" onclick="updateEvent('${eventInfo.event.id}',true)" class="btn btn-secondary" data-bs-dismiss="modal">Confirm and Notify</button>
      <button type="button" onclick="updateEvent('${eventInfo.event.id}')" class="btn btn-primary" data-bs-dismiss="modal">Confirm</button>`;

    showModal(event);
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


/************************
 * EVENT SOURCES
 * 
 */

async function events(fetchInfo, successCallback, failureCallback) {

  let result = await fetchEvents(fetchInfo);

  if (result.messages[0].code == 0) {
    //  console.log(result.response.dataInfo.foundCount + " Events found");
    successCallback(result);
  } else if (result.messages[0].code == 401) {
    //  OK, records not found
    failureCallback();
  } else {
    //  ISSUE WARNING LOG
    failureCallback(result.messages[0]);
  }
}
function eventSourceSuccess(rawEvents, response, index) {
  // SET DEFAULT FIELDS BY TABLE??

  return sourceSuccess(rawEvents, index);
  //{"response":{},"messages":[{"code":"401","message":"No records match the request"}]}
  //{"response":{"dataInfo":{"database":"LabTime","layout":"#Event","table":"#Event","totalRecordCount":246635,"foundCount":201,"returnedCount":201},"data":[{"fieldData":{"@UUID":"12382B2A-FF0B-BE42-BB47-3641C33EC29A","start.timestamp":"01/31/2024 09:00:00","end.timestamp":"01/31/2024 17:00:00","name":"Kluherz, Tk","location":"STF.139","account":"","status":"Confirmed","notes":"Cryostat","@fkey source":"9D2A0683-B4F0-9E43-93CC-B35F3229A841\r493F6ABB-76CE-4A1C-BE7F-FC2237453997\rD6BBD78D-239D-4100-81A8-8499CFDB23A7","#Event|Room::_Name":"STF.139","#Event|Person::_Name":"Kluherz, Tk","#Event|Person::@UUID":"9D2A0683-B4F0-9E43-93CC-B35F3229A841","#Event|Person::@fkey.Person":"DB83BC02-6D66-1D42-9598-0D825B04670F","#Event|Person!creator::@UUID":"9D2A0683-B4F0-9E43-93CC-B35F3229A841","#Event|Person::full_name":"Tk Kluherz"},"portalData":{"portal.event.activity":[{"recordId":"89","#Event|Activities::title":"Zone 2 - Princeton PL","#Event|Activities::@UUID":"D6BBD78D-239D-4100-81A8-8499CFDB23A7","?#Event|ACTIVITIES|Reservation!current::@UUID":"","modId":"1"}],"portal.extendedHours":[]},"recordId":"284462","modId":"1","portalDataInfo":[{"portalObjectName":"portal.event.activity","database":"Resops_Data","table":"#Event|Activities","foundCount":1,"returnedCount":1},{"portalObjectName":"portal.extendedHours","database":"Resops_Data","table":"#Event|Room|Locations|Competency|Proficiencies","foundCount":0,"returnedCount":0}]},
  // ,"messages":[{"code":"0","message":"OK"}]}
}


/************************
 * EVENT DISPLAY
 * 
 */

function eventDidMount(arg) {
  // {event, timeText, isStart, isEnd, isMirror, isPast, isFuture, isToday, el, view}
  if (arg.isMirror) return true;
  //CORRECT BACKGROUND TEXT COLORS
  if (arg.event.textColor && arg.event.display == "background") {
		arg.el.style.color=arg.event.textColor;
	}
  createPopover(arg);
};





/** DATE CLICKING AND SELECTING******************************************
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

function selectOverlap(event){
  // NOT WORKING IN SCHEDULER
  if (event.extendedProps.status == "Support"){
    toaster("Warning: Overlapping support reservation");
  }

  return event.extendedProps.status != "Shutdown";
  //CHECK NUMBER OF EXISTING OVERLAPPING USERS?
}
function selectConstraint(){
  if ( SETTINGS.USER.access == "user"  && calendar.getOption("businessHours") ) {
    return "businessHours";
  } else {
    // MODIFIED BY ACCESS ONLOAD
    return SETTINGS.calendar.constraint;
  };
}
function selectAllow(selectInfo){
  // BUSINESSHOURS DETERMINED ONLOAD BY USER.ACCESS
  // ALL USERS LIMITED TO CALENDAR.START and CALENDAR.END
  // CALENDAR.START AND CALENDAR.END SET TO SOURCE.OPEN AND SOURCE.CLOSE ONLOAD BY USER.ACCESS
  let validStart = isEventAfterStart(selectInfo);
  let validEnd = isEventBeforeEnd(selectInfo);
  if (validStart.response && validEnd.response) return true;
  else {
    let message = validStart.response ? validEnd.message : validStart.message;
    toaster(message);
  }
}
function dateClick(dateInfo) {
  // {date, dateStr, allDay, dayEl, jsEvent, view, resource*}
  //https://fullcalendar.io/docs/dateClick

  if (dateInfo.view.type == "dayGridMonth") { //dayGridWeek | dayGridDay | dayGridYear | multiMonthYear

    let validStart = isEventAfterStart({start:dateInfo.date, end:dateInfo.date});
    let validEnd = isEventBeforeEnd({start:dateInfo.date, end:dateInfo.date});
    if (validStart.response && validEnd.response) {
      //NEW EVENT for day at current time for 1 hour
      let today = new Date();
      start = new Date(dateInfo.date);
      start.setHours(today.getHours()+1,0,0,0);
      end = new Date(start);
      end.setHours(start.getHours()+1,0,0,0);
      let event = {
        ...dateInfo,
        title: "Confirm New Event",
        start: start,
        end: end,
        footer: `
        <button type="button" class="btn btn-warning" data-bs-dismiss="modal">Cancel</button>
        <button type="button" onclick="newEvent()" class="btn btn-primary" data-bs-dismiss="modal">Confirm</button>` };
      let validHours = isEventDuringBusinessHours(event);
      if ( validHours.response ) {
        SETTINGS._EVENT = event;
        showModal(event);
      } else toaster(validHours.message);

    } else {
      let message = validStart.response ? validEnd.message : validStart.message;
      toaster(message);
    }
  }
};
function select(selectionInfo) {
  // {start, end, startStr, endStr, allDay, jsEvent, view, resource*}
  //https://fullcalendar.io/docs/select-callback
  // NEW EVENT
  selectionInfo.view.calendar.unselect();

  let event = {
    ...selectionInfo,
    title: "Confirm New Event",
    footer: `
      <button type="button" class="btn btn-warning" data-bs-dismiss="modal">Cancel</button>
      <button type="button" onclick="newEvent()" class="btn btn-primary" data-bs-dismiss="modal">Confirm</button>` };
  SETTINGS._EVENT = event;
  showModal(event);
};


/** EVENT CLICKING AND HOVERING*****************************************
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

  eventInfo.event.footer = eventInfo.event.startEditable || eventInfo.event.durationEditable ? `
    <button id="eventDelete" onclick="deleteEvent('${eventInfo.event.id}')" type="button" class="btn btn-danger" data-bs-dismiss="modal">Delete</button>
    <button id="eventEdit" onclick="viewEvent('${eventInfo.event.id}')" type="button" class="btn btn-primary" data-bs-dismiss="modal">Edit</button>
  ` : "";

  showModal(eventInfo.event);
}
//function eventMouseEnter(mouseEnterInfo) { };
//function eventMouseLeave(eventInfo) { };


/** EVENT DRAGGING AND RESIZING*****************************************
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
  if (stillEvent.extendedProps.status == "Support"){
    toaster("Warning: Overlapping support reservation");
  }

  if (stillEvent.extendedProps.status == "Shutdown" && movingEvent.extendedProps.status != "Support") {
    toaster("Cannot overlap shutdown reservation");
    return false;
  } else {

    return true;
  }
};
function eventAllow(dropInfo, draggedEvent) {
  //RUN TESTS WHEN DRAGGING AND DROPPING
//  console.log(JSON.stringify(draggedEvent));
  if (SETTINGS.USER.access == "user" && draggedEvent.extendedProps.status == "Confirmed"){
    let isDuringBusinessHours = isEventDuringBusinessHours(dropInfo);
//    console.log(isDuringBusinessHours);
    if (!isDuringBusinessHours.response){
      toaster(isDuringBusinessHours.message);
      return false;
    }
  }
    //TEST FOR MAX USERS
    //TEST FOR USERHOURS
  return true;
};





function eventContent(arg) {

  let event = arg.event;

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
    */


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
*/
    let content = `
      <div class="fc-event-main-frame">
      <div class="fc-daygrid-event-dot"></div>
      <div class="fc-event-time">${arg.timeText}</div>

        <div class="fc-event-title fc-sticky d-flex justify-content-between">${title}</div>

    </div>`;

    return { html: content }
  } else if ( arg.view.type == "timegridWeek" ) {
    
  }

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