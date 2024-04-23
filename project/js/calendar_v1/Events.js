

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
    borderColor: "#5D9632,",
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

  const FIELDS = SETTINGS.event;
  const { start, end } = fetchInfo;
//  const startDate = getTimestampString(fetchInfo.start);
//  const endDate = getTimestampString(fetchInfo.end);

//  const { start: e1Start, end: e1End } = event;
  const { id: sourceId, source: sourceKey, layout: layout } = SETTINGS.eventSources[fetchInfo.index];
//  let sourceId = SETTINGS.eventSources[fetchInfo.index].id;
//  let sourceKey = SETTINGS.eventSources[fetchInfo.index].source;
//  let layout = SETTINGS.eventSources[fetchInfo.index].layout;

  let query = {
    layouts: layout,
    limit: 1000,
    offset: 1,
    query: [
      {
        [FIELDS.start]: `${getTimestampString(start)}...${getTimestampString(end)}`,
        [sourceKey]: `${sourceId}`,
      },
      {
        [FIELDS.end]: `${getTimestampString(start)}...${getTimestampString(end)}`,
        [sourceKey]: `${sourceId}`,
      },
    ],
  };

  let param = {
    method: API + ".fetchEvents",
    config: { webviewer: WEBVIEWER, function: "" },
    data: query,
  };

  let events = PerformCallback(SCRIPT, param, {
    timeOut: 30000,
    scriptOption: 5
  });
  return events;
}
function sourceSuccess(rawEvents, index){
  if (!SETTINGS.FIELDS[index]) SETTINGS.FIELDS[index] = getEventFields(index);
  return rawEvents.response.data;
}
function getEventFields(index){

  const FIELDS = SETTINGS.eventSources[index].fields;
  let eventFields = {};
  for (const key in FIELDS) {
    let field = FIELDS[key];
    const [tableName, fieldName] = field.split("::");
    eventFields[key] = (SETTINGS.calendar.table != tableName) ? field : fieldName;
  }

  return eventFields;
}
/*
function getFieldName (field, index) {
  const [tableName, fieldName] = field.split("::");

  if (SETTINGS.eventSources[index].table != tableName) return field;
  else return fieldName;
}
*/
function formatEvent(event, index) {
  //COLOR BASED ON STATUS = CONFIRMED | CANCELED | UNATTENDED | SUPPORT | EDITING
  //DISPLAY BASED ON STATUS = SHUTDOWN
  //NOT CONVERTED TO EVENT OBJECT YET

  if (event.status == "Shutdown" && event.notes){
    // SET SHUTDOWN TITLE TO NOTES
    event.title = event.notes;
  }
  formatting = EVENT_FORMAT[event.status] ? EVENT_FORMAT[event.status] : EVENT_FORMAT.default;
  Object.assign(event, formatting);

  return event;
};





function newEvent() {
  let event = SETTINGS._EVENT;
  delete SETTINGS._EVENT;

  // VERIFY EVENT BY CALLING
  // calendar.addEvent( event , true )
  // Triggers eventAdd(addInfo)

  // RECEIVE EVENT ON eventAdd() callback
  // IF PASSING TESTS, call FILEMAKER
  // IF NOT, REVERT EVENT

  let param = {
    method: API + ".newEvent",
    config: { webviewer: WEBVIEWER, function: "refetchEvents" },
    data: { event: { ...event, start: getTimestampString(event.start), end: getTimestampString(event.end),
      person: SETTINGS.USER.id, source: SETTINGS.eventSources[0].id } },
  };
  FileMaker.PerformScriptWithOption(
    SCRIPT,
    JSON.stringify(param),
    5
  );
};
function deleteEvent(eventID) {
  calendar.getEventById(eventID).remove();
  // Triggers eventRemove()
}
function revert_EVENT() {
  SETTINGS._EVENT.revert();
  delete SETTINGS._EVENT;
}
function updateEvent(eventID, notify) {
  //SETTINGS._EVENT HAS EVENT FOR REVERT
  delete SETTINGS._EVENT;

  let event = calendar.getEventById(eventID);
  //ONCE UPDATED, UPDATE POPOVER...
  createPopover( {event: event, el: document.getElementById("popover."+eventID)} );

  let param = {
    method: API + ".eventChange",
    config: { webviewer: WEBVIEWER, function: "" },
    data: { event: { ...event.toPlainObject(), start: getTimestampString(event.start), end: getTimestampString(event.end),
      person: SETTINGS.USER.id, source: SETTINGS.eventSources[0].id }, notify: notify },
  };
  FileMaker.PerformScriptWithOption(
    SCRIPT,
    JSON.stringify(param),
    5
  );
};
function viewEvent(eventID) {
  let event = calendar.getEventById(eventID);

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


function createPopover(arg) {
//  { event, element }
  let event = arg.event;

  let edit = event.startEditable || event.durationEditable ? `
    <i class="bi bi-pencil-fill"></i>` : "";
  let title = `
    <div class="d-flex justify-content-between">
      <div>${event.title}</div>
      <div class="px-2"></div>
      <div>${edit}</div>
    </div>`;

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
  if (event.extendedProps?.resources.length ?? false) {
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
function showModal(event) {

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
      <h5 class="modal-title" id="eventTitle">${event.title}</h5>
      <button type="button" ${event.close} class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
    </div>`;
  const contentBody = `
    <div class="modal-body">
      ${status}
      ${range}
      ${account}
      ${resources}
      ${notes}
    </div>`;
  const contentFooter = event.footer ? `
      <div class="modal-footer justify-content-between">
        ${event.footer}
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



































