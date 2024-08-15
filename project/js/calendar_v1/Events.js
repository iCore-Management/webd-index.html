

const EVENT_STATUS = {
  normal : "Confirmed",
  unattended : "Unattended",
  support : "Support",
  shutdown : "Shutdown",
  canceled : "Canceled",
  editing : "EDITING"
};
const EVENT_FORMAT = {
  [EVENT_STATUS.normal] : {
    backgroundColor: "#00A3E4",
    borderColor: "#0077C8",
    textColor: "white",
  },
  [EVENT_STATUS.unattended]: {
    backgroundColor: "#D0D4D7",
    borderColor: "#5E6970",
    textColor: "black",
  },
  [EVENT_STATUS.support]: {
    backgroundColor: "#FFC423",
    borderColor: "#D48500",
    textColor: "black",
  },
  [EVENT_STATUS.canceled]: {
    backgroundColor: "#923B05",
    borderColor: "#923B05",
    textColor: "black",
  },
  [EVENT_STATUS.shutdown]: {
    backgroundColor: "Black",
    borderColor: "#D0D4D7",
    textColor: "White",
    display: "background",
  },
  [EVENT_STATUS.editing]: {
    backgroundColor: "#5D9632",
    borderColor: "#5D9632",
    textColor: "white",
    
  },
  default: {
    backgroundColor: "#00A3E4",
    borderColor: "#0077C8",
    textColor: "white",
  }
};

function fetchEvents(fetchInfo) {
//  { start, end, startStr, endStr, timeZone }
//  https://fullcalendar.io/docs/events-function

  const { start, end, index } = fetchInfo;
  const { id: id } = SETTINGS.SOURCES[index];
  const layout = SETTINGS.QUERY.layout;
  const FIELDS = SETTINGS.QUERY.fields;

  let query = {
    layouts: layout,
    limit: 1000,
    offset: 1,
    query: [
      {
        [FIELDS.start]: `${getTimestampString(start)}...${getTimestampString(end)}`,
        [FIELDS.key]: `${id}`,
      },
      {
        [FIELDS.end]: `${getTimestampString(start)}...${getTimestampString(end)}`,
        [FIELDS.key]: `${id}`,
      },
    ],
  };

  let param = {
    method: API + ".fetchEvents",
    config: { webviewer: WEBVIEWER, function: "" },
    data: { query, source : index },
  };

  let events = PerformCallback(SCRIPT, param, {
    timeOut: 30000,
    scriptOption: 5
  });
  return events;
}
/*
function sourceSuccess(rawEvents, index){

  return rawEvents.response.data;
}*/

function getEventFields(table, fields){

  const FIELDS = fields;
  let eventFields = {};
  for (const key in FIELDS) {
    let field = FIELDS[key];
    eventFields[key] = getFieldName(table, field);
  }

  return eventFields;
}

function getFieldName (table, field) {
  const [tableName, fieldName] = field.split("::");

  if (table != tableName) return field;
  else return fieldName;
}

function formatEvent(event, index) {
  //COLOR BASED ON STATUS = CONFIRMED | CANCELED | UNATTENDED | SUPPORT | EDITING
  //DISPLAY BASED ON STATUS = SHUTDOWN
  //NOT CONVERTED TO EVENT OBJECT YET

 // if (event.status == "Shutdown" && event.notes){
    // SET SHUTDOWN TITLE TO NOTES
//    event.title = event.notes;
//  }
  formatting = EVENT_FORMAT[event.status] ? EVENT_FORMAT[event.status] : EVENT_FORMAT.default;
  Object.assign(event, formatting);

  return event;

};

function createEvent(eventInfo) {
  // COMES FROM SELECT OR DATECLICK


  eventInfo.extendedProps = {
    person: SETTINGS.USER.id,
    name: SETTINGS.USER.name,
    status : EVENT_STATUS.normal,
    room: SETTINGS.CALENDAR.id,
    location : SETTINGS.CALENDAR.title,
//    resources : eventInfo.resource?.id != null && eventInfo.resource?.id != SETTINGS.CALENDAR.id ? [{title : eventInfo.resource.title}] : null,
  };

  //{"resource":{"id":"493F6ABB-76CE-4A1C-BE7F-FC2237453997","title":"STF.139"}



  eventInfo.resourceIDs = [SETTINGS.CALENDAR.id];
//  console.log(JSON.stringify(eventInfo));
  if (eventInfo.resource?.id && eventInfo.resource.id != SETTINGS.CALENDAR.id) {
    eventInfo.extendedProps.resources = [{title : eventInfo.resource.title, id: eventInfo.resource.id}];
//    eventInfo.resourceIDs = [SETTINGS.CALENDAR.id,eventInfo.resource.id];
    eventInfo.resourceIDs.push(eventInfo.resource.id);
//    console.log(JSON.stringify(eventInfo.resourceIDs));
//    console.log(eventInfo.resource.id);
  } //else {
//    eventInfo.resourceIDs = [SETTINGS.CALENDAR.id];
//  }

  if (document.getElementById("warning")) bootstrap.Toast.getOrCreateInstance(document.getElementById("warning")).hide();
  let result = isValid(eventInfo);
  if (!result.response) {
    toaster(result.message);
    return false;
  }

  // DEEP COPY
  SETTINGS._EVENT = { event: JSON.parse(JSON.stringify(eventInfo)) };
  // REMOVE STATUS FOR MODAL
  eventInfo.extendedProps.status = "";
  let modal = {
    event : eventInfo,

    title: "Confirm New Event",
    close : `onclick="calendar.unselect()"`,
    footer: `
        <button type="button" onclick="calendar.unselect()" class="btn btn-warning" data-bs-dismiss="modal">Cancel</button>
        <button type="button" onclick="viewEvent()" class="btn btn-primary" data-bs-dismiss="modal">Edit</button>
        <button type="button" onclick="newEvent()" class="btn btn-success" data-bs-dismiss="modal">Confirm</button>`
  };

  showModal(modal);
}

function newEvent() {
  // COMES FROM MODAL
  // AFTER PASSING TESTS
  let event = SETTINGS._EVENT.event;
  delete SETTINGS._EVENT;
  
//  event.extendedProps.status = EVENT_STATUS.normal;
//  event.source = SETTINGS.CALENDAR.id;
  event.start = getTimestampString(event.start);
  event.end = getTimestampString(event.end);

  event.notify = SETTINGS.USER.id != event.extendedProps.person;
//  event.notify = notify;

  /**
   * NEW SELECTION CONFIRMED BY USER
   * NEED TO VERIFY EVENT WITH FM:
   *  ACCOUNT REQUIRED?
   *  SSO STATUS? SHOULD I SEND Option.selectable = false if not an SSO User?
   * 
   * IN API.newEvent, if things are required, view event in FM
   *  since FM calls refetch events, nothing to revert if canceled
   *  does have to wait for completion so FM creates record with needed basic info before refetchEvents
   * 
   */

//    calendar.addEvent( event, true );
    // Triggers eventAdd(addInfo)

    let param = {
      method: API + ".newEvent",
      config: { webviewer: WEBVIEWER, function: "refetchEvents" },
      data: {
        event: event
      },
    };
    FileMaker.PerformScriptWithOption(
      SCRIPT,
      JSON.stringify(param),
      5
    );
    calendar.unselect();
};
function deleteEvent(eventID) {
  calendar.getEventById(eventID).remove();
  // Triggers calendar.eventRemove(eventInfo) {event, relatedEvents, revert}
}
/*
function revert_EVENT() {
  SETTINGS._EVENT.revert(); 
  delete SETTINGS._EVENT;
}
*/
function updateEvent(eventID, notify) {
  //SETTINGS._EVENT HAS EVENT FOR REVERT
  delete SETTINGS._EVENT;

  let event = calendar.getEventById(eventID);
  //ONCE UPDATED, UPDATE POPOVER...
  createPopover( {event: event, el: document.getElementById("popover."+eventID)} );

  //CAN ONLY CHANGE THE DATES ??
  let param = {
    method: API + ".eventChange",
    config: { webviewer: WEBVIEWER, function: "" },
    data: { event: { ...event.toPlainObject(), start: getTimestampString(event.start), end: getTimestampString(event.end),
      person: SETTINGS.USER.id, source: SETTINGS.CALENDAR.id }, notify: notify },
  };
  FileMaker.PerformScriptWithOption(
    SCRIPT,
    JSON.stringify(param),
    5
  );
};
function viewEvent(eventID) {
  let event;
  if ( !eventID ) {
    event = SETTINGS._EVENT.event;
    event.start = getTimestampString(event.start);
    event.end = getTimestampString(event.end);
//    event.person = SETTINGS.USER.id;
//    event.source = SETTINGS.CALENDAR.id;
delete SETTINGS._EVENT;

  } else {
    event = calendar.getEventById(eventID);
  }
  
  

  let param = {
    method: API + ".eventClick",
    config: { webviewer: WEBVIEWER, function: "refetchEvents" },
    data: { event: event },
  };
  FileMaker.PerformScriptWithOption(
    SCRIPT,
    JSON.stringify(param),
    5
  );
  calendar.unselect();
};
function eventUpdated(success){
  if (success != true) {
    SETTINGS._EVENT.revert(); 
  }
  delete SETTINGS._EVENT;
}


function createPopover(arg) {
//  { event, el }
  let event = arg.event;

  let edit = event.startEditable || event.durationEditable ? `
    <i class="bi bi-pencil-fill"></i>` : "";
  let title = `
    <div class="d-flex justify-content-between">
      <div>${event.title}</div>
      <div class="px-2"></div>
      <div>${edit}</div>
    </div>
    <div class="small">${event.extendedProps.location}</div>`;

  let rangeFormat = {
    hour: "numeric",
    minute: "2-digit"
  };
  if (event.allDay == true) {
    rangeFormat = {
      month: "numeric",
      day: "2-digit"
    };
  } else if (event.start.getDate() != event.end.getDate()) {
    rangeFormat = {
      ...rangeFormat,
      month: "numeric",
      day: "2-digit"
    };
  };
  let range = `<div>${calendar.formatRange(event.start, event.end, rangeFormat)}</div>`;

  let resources = "";
  if (event.extendedProps?.resources?.length ?? false) {
    event.extendedProps.resources.forEach((resource) => {
      resources += `<li>${resource.title}</li>`;
    });
    resources = `<div class="mt-2">Resources:
    <ul>${resources}</ul></div>`;
  };

  const content = `
    <div><strong>${event.extendedProps.status}</strong></div>
    ${range}
    ${resources}`;
  /*
    Object.assign( arg.el, {
      [data-bs-toggle] : "popover",
      [data-bs-trigger] : "hover",
      [data-bs-placement] : "left",
      [data-bs-html] : "true",
      [data-bs-content] : content,
      [title] : `<div class="d-flex justify-content-between"><div>${event.title}</div>${edit}</div>`
    });
  */
  arg.el.setAttribute("id", "popover."+event.id);
  arg.el.setAttribute("data-bs-toggle", "popover");
  arg.el.setAttribute("data-bs-trigger", "hover");
  arg.el.setAttribute("data-bs-placement", "left");
  arg.el.setAttribute("data-bs-html", "true");
  arg.el.setAttribute("data-bs-content", content);
  arg.el.setAttribute("title", title);

  new bootstrap.Popover(arg.el);
};
function showModal(eventInfo) {

  let event = eventInfo.event;
  //CREATE MODAL CONFIRMATION
  let element;
  if (document.getElementById("eventConfirmationModal")) {
    element = document.getElementById("eventConfirmationModal");
  } else {
    element = document.createElement("div");
    document.body.appendChild(
      Object.assign(element, {
        id: "eventConfirmationModal", className: "modal fade"
      }));
  }

  let name = eventInfo.title != event.extendedProps?.name ? `<div>${event.extendedProps.name}</div>` : "";
  let location = eventInfo.title != event.extendedProps?.location ? `<div>${event.extendedProps.location}</div>` : "";
  let status = event.extendedProps?.status ? `<div><strong>${event.extendedProps.status}</strong></div>` : "";

  let date = "";
  let rangeFormat = {
    hour: "numeric",
    minute: "2-digit"
  };
//  let start = calendar.formatDate(event.start,rangeFormat)+"<br>";
  if (event.start.getDate() != event.end.getDate()) {
    rangeFormat = {
      ...rangeFormat,
      month: "numeric",
      day: "2-digit"
    };
  } else {
    date = calendar.formatDate(event.start,{
      month: "numeric",
      day: "2-digit",
      weekday: "long",
    })+"<br>";
  };
  let range = `<div>${date}${calendar.formatRange(event.start, event.end, rangeFormat)}</div>`;

  let account = event.extendedProps?.account ? `<div class="mt-1">Charge Code: ${event.extendedProps.account}</div>` : "";

  let resources = "";
  if (event.extendedProps?.resources?.length ?? false) {
    event.extendedProps.resources.forEach((resource) => {
      resources += `<li>${resource.title}</li>`;
    });
    resources = `<div class="mt-2">Resources:
    <ul>${resources}</ul></div>`;
  };

  let notes = event.extendedProps?.notes ? `
    <div class="popover-label-sm mt-2">Notes</div>
    <div class="popover-notes mb-2"><em>${event.extendedProps.notes}</em></div>
    ` : "";

  const contentHeader = `
    <div class="modal-header">
      <div>
      <div class="h5">${eventInfo.title}</div>
      ${name}
      ${location}
      </div>
      <button type="button" ${eventInfo.close} class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
    </div>`;
  const contentBody = `
    <div class="modal-body">

      ${status}
      ${range}
      ${account}
      ${resources}
      ${notes}
    </div>`;
  const contentFooter = eventInfo.footer ? `
      <div class="modal-footer justify-content-between">
        ${eventInfo.footer}
      </div>
    ` : "";

  element.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        ${contentHeader}
        ${contentBody}
        ${contentFooter}
      </div>
    </div>`;

  let modal = new bootstrap.Modal(element);
  modal.toggle();
}



