

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
        [FIELDS.start]: `< ${getTimestampString(end)}`,
        [FIELDS.end]: `> ${getTimestampString(start)}`,
        [FIELDS.key]: `${id}`,
      },
//      {
//        [FIELDS.end]: `${getTimestampString(start)}...${getTimestampString(end)}`,
//        [FIELDS.key]: `${id}`,
//      },
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

function formatEvent(event) {
  // COLOR BASED ON STATUS = CONFIRMED | CANCELED | UNATTENDED | SUPPORT | EDITING
  // DISPLAY BASED ON STATUS = SHUTDOWN
  // NOT CONVERTED TO EVENT OBJECT YET


  formatting = EVENT_FORMAT[event.status] ? EVENT_FORMAT[event.status] : EVENT_FORMAT.default;
  Object.assign(event, formatting);

  return event;
};

function createEvent(eventInfo) {
  // COMES FROM SELECT OR DATECLICK
  // NOT CONVERTED TO EVENT OBJECT YET

  eventInfo.extendedProps = {
    person: SETTINGS.USER.id,
    name: SETTINGS.USER.name,
    status : EVENT_STATUS.normal,
    room: SETTINGS.CALENDAR.id,
    location : SETTINGS.CALENDAR.title,
  };

  // APPLY PRIMARY RESOURCE
  eventInfo.resourceIDs = [];
  eventInfo.extendedProps.resources = [];
  //DOESN'T KNOW ABOUT RESERVATIONS...
  if (eventInfo.resource?.id && eventInfo.resource.id != SETTINGS.CALENDAR.id) {
    eventInfo.extendedProps.resources.push({title : eventInfo.resource.title, uuid: eventInfo.resource.id});
    eventInfo.resourceIDs.push(eventInfo.resource.id);
  }
  eventInfo.resourceIDs.push(SETTINGS.CALENDAR.id);
//  eventInfo.extendedProps.resources.push({id:SETTINGS.CALENDAR.id, title: SETTINGS.CALENDAR.title});

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
  // AFTER PASSING isValid
  let event = SETTINGS._EVENT.event;
  delete SETTINGS._EVENT;

  calendar.addEvent( event, true );
  // Triggers Calendar.eventAdd(addInfo)

};
function deleteEvent(eventID) {
  calendar.getEventById(eventID).remove();
  // Triggers calendar.eventRemove(eventInfo) {event, relatedEvents, revert}
}

function updateEvent(eventID, notify) {
  //SETTINGS._EVENT HAS EVENT FOR REVERT
  let event = SETTINGS._EVENT.event;
  delete SETTINGS._EVENT;

  //ONCE UPDATED, UPDATE POPOVER...
  //POSSIBLY UPDATE RESEOURCES (JUST UPDATES TIMES)
  var resources = event.getResources().filter(Boolean).map(function(resource) { return { uuid: resource.id, title: resource.title } });
  resources.shift();

  document.querySelectorAll(`[id="popover.${eventID}"]`).forEach((el) => {
    createPopover( {event, el}, resources );
  });

  var resourceIds = event.getResources().filter(Boolean).map(function(resource) { return resource.id });
  var key = [event.extendedProps.person].concat(resourceIds);

  let param = {
    method: API + ".eventChange",
    config: { webviewer: WEBVIEWER, function: "" },
    data: { event: { ...event.toPlainObject(), start: getTimestampString(event.start), end: getTimestampString(event.end), notify: notify,
      key : key
     } },
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
    delete SETTINGS._EVENT;
    event.start = getTimestampString(event.start);
    event.end = getTimestampString(event.end);

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
};
function eventUpdated(success){
  if (success != true) {
    SETTINGS._EVENT.revert(); 
  }
  delete SETTINGS._EVENT;
}

function createPopover(arg, activities) {
//  { event, el }
  let event = arg.event;

  let edit = event.startEditable || event.durationEditable ? `
    <i class="bi bi-pencil-fill"></i>` : "";
  let name = event.title == event.extendedProps?.location ? event.extendedProps?.name : event.extendedProps.location;
  let title = `
    <div class="d-flex justify-content-between">
      <div>${event.title}</div>
      <div class="px-2"></div>
      <div>${edit}</div>
    </div>
    <div class="small">${name}</div>`;

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

  resources = activities ? activities : event.extendedProps?.resources;
  
  let resourceList = "";
  if (resources?.length ?? false) {
    resources.forEach((resource) => {
      resourceList += `<li>${resource.title}</li>`;
    });
    
    resourceList = `<div class="mt-2">Resources:
    <ul>${resourceList}</ul></div>`;
  };
  
  const content = `
    <div><strong>${event.extendedProps.status}</strong></div>
    ${range}
    ${resourceList}`;
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

  let popover = bootstrap.Popover.getInstance(arg.el);
  if ( popover ) popover.dispose();

  arg.el.setAttribute("id", "popover."+event.id);
  arg.el.setAttribute("data-bs-toggle", "popover");
  arg.el.setAttribute("data-bs-trigger", "hover");
  arg.el.setAttribute("data-bs-placement", "left");
  arg.el.setAttribute("data-bs-html", "true");
  arg.el.setAttribute("data-bs-content", content);
  arg.el.setAttribute("data-bs-title", title);

  bootstrap.Popover.getOrCreateInstance(arg.el);
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

//  let title = eventInfo.title == eventInfo.extendedProps?.name ? eventInfo.extendedProps.name : eventInfo.extendedProps?.location;
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



