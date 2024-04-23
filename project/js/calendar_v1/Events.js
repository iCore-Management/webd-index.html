//import { Popover } from "bootstrap";
//import { Popover } from "https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js";

const format = {
  Confirmed: {
    backgroundColor: "#00A3E4",
    borderColor: "#0077C8",
    textColor: "white",
  },
  Unattended: {
    backgroundColor: "#D0D4D7",
    borderColor: "#5E6970",
    textColor: "black",
  },
  Support: {
    backgroundColor: "#FFC423",
    borderColor: "#D48500",
    textColor: "black",
  },
  Canceled: {
    backgroundColor: "#923B05",
    borderColor: "#923B05",
    textColor: "black",
  },
  Shutdown: {
    backgroundColor: "#D0D4D7",
    borderColor: "#D0D4D7",
    textColor: "black",
  },
  EDITING: {
    backgroundColor: "#5D9632",
    borderColor: "#5D9632,",
    textColor: "white",
    display: "background",
  },
  default: {
    backgroundColor: "#00A3E4",
    borderColor: "#0077C8",
    textColor: "white",
  }
};



async function events(fetchInfo, successCallback, failureCallback) {
  let result = await fetchEvents(fetchInfo);

  if (result.messages[0].code == 0) {
    //    console.log(result.response.dataInfo.foundCount + " Events found");
    successCallback(result);
  } else if (result.messages[0].code == 401) {
    //OK, records not found
    failureCallback();
  } else {
    failureCallback(result.messages[0]);
  }
}
function fetchEvents(fetchInfo) {

  //QUERY FROM fetchINFO, needs Layout (and table?) comes from query results...
  const FIELDS = SETTINGS.event;
  const startDate = fetchInfo.start.toLocaleDateString();
  const endDate = fetchInfo.end.toLocaleDateString();

  var sourceId, sourceKey, layout;
  //  console.log(fetchInfo.source);
  //source is an Event Source id
  if (fetchInfo.index != null) {
    //   console.log(fetchInfo.index);

    // WHICH SOURCE TO USE?
    sourceId = SETTINGS.eventSources[fetchInfo.index].id;
    sourceKey = SETTINGS.eventSources[fetchInfo.index].source;
    layout = SETTINGS.eventSources[fetchInfo.index].layout;
  } else {
    //    console.log(fetchInfo.source);
    const source = calendar.getEventSourceById(fetchInfo.source);
    sourceId = source.id;
    sourceKey = source.extendedProps.source;
    layout = source.extendedProps.layout;
  }

  let dataAPI = {
    layouts: layout,
    limit: 1000,
    offset: 1,
    query: [
      {
        [FIELDS.start]: `${startDate}...${endDate}`,
        [sourceKey]: `${sourceId}`,
      },
      {
        [FIELDS.end]: `${startDate}...${endDate}`,
        [sourceKey]: `${sourceId}`,
      },
    ],
  };

  let param = {
    method: API + ".fetchEvents",
    config: { webviewer: WEBVIEWER, function: "" },
    data: { query: dataAPI, },
  };
  let events = PerformCallback(SCRIPT, param, {
    timeOut: 30000,
    scriptOption: 5
  });

  return events;
}
function eventSourceSuccess(rawEvents, response) {
  //TRANFORM rawEvents TO AN ARRAY and RETURN
  //PROCESS SOME BASIC MAP BEFORE eventDataTransform?
  //result = arr.map(({pageIndex: id, pageName: name}) => ({id, name}));
  /*
    let transform = SETTINGS.EVENT_FIELDS;
    let result = rawEvents.response.data.map(( event ) => ({ ...event,
      fieldData : { ...fieldData,
        start : new Date(event.fieldData[transform.start]),
        end : new Date(event.fieldData[transform.end]),
      },
    }) );
  */
  return rawEvents.response.data;

  //{"response":{},"messages":[{"code":"401","message":"No records match the request"}]}
  //{"response":{"dataInfo":{"database":"LabTime","layout":"#Event","table":"#Event","totalRecordCount":246635,"foundCount":201,"returnedCount":201},"data":[{"fieldData":{"@UUID":"12382B2A-FF0B-BE42-BB47-3641C33EC29A","start.timestamp":"01/31/2024 09:00:00","end.timestamp":"01/31/2024 17:00:00","name":"Kluherz, Tk","location":"STF.139","account":"","status":"Confirmed","notes":"Cryostat","@fkey source":"9D2A0683-B4F0-9E43-93CC-B35F3229A841\r493F6ABB-76CE-4A1C-BE7F-FC2237453997\rD6BBD78D-239D-4100-81A8-8499CFDB23A7","#Event|Room::_Name":"STF.139","#Event|Person::_Name":"Kluherz, Tk","#Event|Person::@UUID":"9D2A0683-B4F0-9E43-93CC-B35F3229A841","#Event|Person::@fkey.Person":"DB83BC02-6D66-1D42-9598-0D825B04670F","#Event|Person!creator::@UUID":"9D2A0683-B4F0-9E43-93CC-B35F3229A841","#Event|Person::full_name":"Tk Kluherz"},"portalData":{"portal.event.activity":[{"recordId":"89","#Event|Activities::title":"Zone 2 - Princeton PL","#Event|Activities::@UUID":"D6BBD78D-239D-4100-81A8-8499CFDB23A7","?#Event|ACTIVITIES|Reservation!current::@UUID":"","modId":"1"}],"portal.extendedHours":[]},"recordId":"284462","modId":"1","portalDataInfo":[{"portalObjectName":"portal.event.activity","database":"Resops_Data","table":"#Event|Activities","foundCount":1,"returnedCount":1},{"portalObjectName":"portal.extendedHours","database":"Resops_Data","table":"#Event|Room|Locations|Competency|Proficiencies","foundCount":0,"returnedCount":0}]},
  // ,"messages":[{"code":"0","message":"OK"}]}
}

function eventDataTransform(eventData) {
  //TRANSFORM eventSourceSuccess ARRAY ITEM TO PARSABLE EVENT OBJECT
  // NEEDS transformSettings to map FM fields to FC properties
  const FIELDS = SETTINGS.event;

  let event = {};
  for (const key in FIELDS) {
    event[key] = eventData.fieldData[FIELDS[key]];
  }

  event.start = new Date(eventData.fieldData[FIELDS.start]);
  event.end = new Date(eventData.fieldData[FIELDS.end]);

  //JUST PASS STATUS = EDITING WHEN ON CURRENT RECORD???
  //  result.status = event["isEditing"] ? "EDITING" : result.status;
  //  result.constraint = [{start:"2024-03-10T00:00:0", end: "2024-4-10T00:00:0"}];
  event.resources = eventData.portalData[FIELDS._resourcesPortal].map((row) => ({
    uuid: row[FIELDS.resourceId],
    title: row[FIELDS.resource]
  })
  );
  //  console.log(JSON.stringify(event));
  let response = formatEvent(event);
  //  console.log(JSON.stringify(response));

  return response;
};
function getField(field) {
  // WHICH SOURCE TO USE?
  let _table = SETTINGS.eventSources[0].table;
  const [tableName, fieldName] = field.split("::");

  if (_table === tableName) {
    return fieldName;
  } else {
    return field;
  }
};
function formatEvent(event) {
  //COLOR BASED ON STATUS = CONFIRMED | CANCELED | UNATTENDED | SUPPORT | EDITING
  //DISPLAY BASED ON STATUS = SHUTDOWN
  //NOT CONVERTED YET

  //EDITABLE BASED ON USER VS EDITORS ( ADMINS, PERSON, SUPERVISOR, CREATOR )
  let users = [
    event.creator,
    event.person,
    event.supervisor
  ];

  // WHICH SOURCE TO USE?
  admins = SETTINGS.eventSources[0].admins;
  editors = users.concat(admins);
  event.editable = editors.includes(SETTINGS.user);
  event.constraint = admins.includes(SETTINGS.user) ? "" : "businessHours";
//  console.log(event.constraint);

  formatting = format[event.status] ? format[event.status] : format.default;
  Object.assign(event, formatting);

  return event;


  //event.editable = false;
  /*
  if (!editors.has(SETTINGS.USER.current)) {
    event.editable = false;
  } else if ( event.end < SETTINGS.SOURCE.close ) { 
    event.editable = false;
    //EDITABLE BASED ON CALENDAR SOURCE CONSTRAINTS??
  } else {
    event.editable = true;
  }

CONSTRAINED TO BUSINESSHOURS FOR REGULAR USERS
NOT CONSTRAINED TO BUSINESSHOURS FOR EXTENDEDHOURS AND ADMINS
if (SETTINGS.USERS.admins.has(SETTINGS.USER.current) || SETTINGS.USERS.extendedHours.has(SETTINGS.USER.current )) {
  event.constraint = "";
} else {
  event.constraint = "businessHours";
};

ALWAYS CONSTRAINED TO SOURCE CLOSE DATE??
NOT EDITABLE BEFORE SOURCE CLOSE DATE??

CONSTRAINED TO SOURCE OPEN DATE FOR USERS
NOT CONSTRAINED TO SOURCE OPEN DATE FOR EXTENDEDHOURS AND ADMINS

*/

}

function dateClick(dateInfo) {
  //https://fullcalendar.io/docs/dateClick
  //alert("View: " + dateClickInfo.view.type);
  if (dateInfo.view.type == "dayGridMonth") { //dayGridWeek | dayGridDay | dayGridYear | multiMonthYear
    //NEW EVENT for day at current time
    if (confirm("New Event: " + dateInfo.dateStr)) {

      let param = {
        method: API + ".newEvent",
        config: { webviewer: WEBVIEWER, function: "refetchEvents" },
        data: { event : { date: dateInfo.date, dateStr: dateInfo.dateStr, allDay: dateInfo.allDay, } },
      };
      FileMaker.PerformScriptWithOption(
        SCRIPT,
        JSON.stringify(param),
        5
      );

    };
  }
};
function select(selectInfo) {
  //https://fullcalendar.io/docs/select-callback
  // NEW EVENT
  selectInfo.view.calendar.unselect();

  SETTINGS._EVENT = selectInfo;
  let event = selectInfo;
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
    let rangeFormat = {
      hour: "numeric",
      minute: "2-digit"
    };
    if (event.start.getDate() != event.end.getDate()) {
      rangeFormat = {
        ...rangeFormat,
        month: "numeric",
        day: "2-digit"
      };
    };
    //let range = `<div>${event.start.getDate() + "-" + event.end.getDate()}</div`;
    let range = `<div>${calendar.formatRange(event.start, event.end, rangeFormat)}</div`;

    //    let source = event.source.id;
    // title = "Confirm Update"
    // body = 
    // footer = "Confirm" "Confirm and Notify" "Cancel"
    const contentHeader = `
    <div class="modal-header">
      <h5 class="modal-title" id="eventTitle">Confirm New Event</h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
    </div>`;
    const contentBody = `
      <div class="modal-body">
        <div>${range}</div>
      </div>`;
    const contentFooter = `
        <div class="modal-footer justify-content-between">
          <button type="button" class="btn btn-warning" data-bs-dismiss="modal">Cancel</button>
          <button type="button" onclick="newEvent()" class="btn btn-primary" data-bs-dismiss="modal">Confirm</button>
        </div>`;

    element.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          ${contentHeader}
          ${contentBody}
          ${contentFooter}
        </div>
      </div>`;
    let modal = new bootstrap.Modal(element);
    modal.toggle();
  }
  function newEvent() {

    selectInfo = SETTINGS._EVENT;
  //format duration
//  if (confirm("New Event: " + selectInfo.startStr)) {

    let param = {
      method: API + ".newEvent",
      config: { webviewer: WEBVIEWER, function: "refetchEvents" },
      data: { event : { start: selectInfo.start, startStr: selectInfo.startStr, end: selectInfo.end, endStr: selectInfo.endStr, allDay: selectInfo.allDay, } },
    };
    FileMaker.PerformScriptWithOption(
      SCRIPT,
      JSON.stringify(param),
      5
    );

};


function eventOverlap(stillEvent, movingEvent) {
  //TEST FOR ALLOW OVERLAP
  //MAX OCCUPANTS?
  return true;
};
function eventAllow(dropInfo, draggedEvent) {
  return true;
};
function eventChange(eventInfo) {
  //https://fullcalendar.io/docs/eventChange
  //UPDATE EVENT
  //SETTINGS.confirmation === 
  // CHECK IF USER doesn't equal person
  //  console.log(SETTINGS.user);
  //  console.log(eventInfo.event.extendedProps.person);
  SETTINGS._EVENT = eventInfo;

  let event = eventInfo.event;
  if (SETTINGS.user != eventInfo.event.extendedProps.person) {
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

    let rangeFormat = {
      hour: "numeric",
      minute: "2-digit"
    };
    if (event.start.getDate() != event.end.getDate()) {
      rangeFormat = {
        ...rangeFormat,
        month: "numeric",
        day: "2-digit"
      };
    };
    let range = `<div>${event.formatRange(rangeFormat)}</div`;

    //    let source = event.source.id;
    // title = "Confirm Update"
    // body = 
    // footer = "Confirm" "Confirm and Notify" "Cancel"
    const contentHeader = `
    <div class="modal-header">
      <h5 class="modal-title" id="eventTitle">Confirm Update</h5>
      <button type="button" onclick="revert_EVENT()" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
    </div>`;
    const contentBody = `
      <div class="modal-body">
        <div>${event.title}</div>
        <div><strong>${event.extendedProps.status}</strong></div>
        <div>${range}</div>
      </div>`;
    const contentFooter = event.startEditable || event.durationEditable ? `
        <div class="modal-footer justify-content-between">
          <button type="button" onclick="revert_EVENT()"  class="btn btn-warning" data-bs-dismiss="modal">Cancel</button>
          <button type="button" onclick="updateEvent('${event.id}',true)" class="btn btn-secondary" data-bs-dismiss="modal">Confirm and Notify</button>
          <button type="button" onclick="updateEvent('${event.id}')" class="btn btn-primary" data-bs-dismiss="modal">Confirm</button>
        </div>` : "";

    element.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          ${contentHeader}
          ${contentBody}
          ${contentFooter}
        </div>
      </div>`;
    let modal = new bootstrap.Modal(element);
    modal.toggle();

    
  } else {
    updateEvent(event.id);
  }
};

/*
  if (!confirm("Update Event: " + eventInfo.event.start.toString())) {
    eventInfo.revert();
  } else {
    let param = {
      method: API + ".eventChange",
      config: { webviewer: WEBVIEWER, function: "" },
      data: { event: eventInfo.event },
    };
    FileMaker.PerformScriptWithOption(
      SCRIPT,
      JSON.stringify(param),
      5
    );
  }
*/

function eventRemove(eventInfo) {
  //REMOVE EVENT
  let notify = SETTINGS.user != eventInfo.event.extendedProps.person;

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
  //  }
};

function deleteEvent(eventID) {
  calendar.getEventById(eventID).remove();
  // Triggers eventRemove()
}
function revert_EVENT() {
  SETTINGS._EVENT.revert();
  delete SETTINGS._EVENT;
  //  calendar.getEventById(eventID).revert();
}
function updateEvent(eventID, notify) {
  //  delete SETTINGS._EVENT;
  //  let event = calendar.getEventById(eventID);
  let event = SETTINGS._EVENT.event;
  delete SETTINGS._EVENT;
  let param = {
    method: API + ".eventChange",
    config: { webviewer: WEBVIEWER, function: "" },
    data: { event: event, notify: notify },
  };
  FileMaker.PerformScriptWithOption(
    SCRIPT,
    JSON.stringify(param),
    5
  );
}
function editEvent(eventID) {
  console.log(eventID);
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
}


function eventMouseEnter(mouseEnterInfo) {};
function eventMouseLeave(eventInfo) { };
function eventClick(eventInfo) {
  //DISMISS POPOVER
  bootstrap.Popover.getInstance(eventInfo.el).hide();

  let element;
  if (document.getElementById("eventClickModal")) {
    element = document.getElementById("eventClickModal");
  } else {
    element = document.createElement("div");
    document.body.appendChild(
      Object.assign(element, {
        id: "eventClickModal", className: "modal fade"
      }));
  }

  newModal(element,eventInfo.event);

  let modal = new bootstrap.Modal(element);
  modal.toggle();

  /*
    <!-- Modal -->
    <div class="modal fade" id="eventClickModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="staticBackdropLabel">Modal title</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            ...
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary">Understood</button>
          </div>
        </div>
      </div>
    </div>
  */
  /*
    if (confirm("View Event: " + JSON.stringify(eventInfo.event))){
  
      let param = { 
        method : API + ".eventClick",
        config : { webviewer : WEBVIEWER, function : "refetchEvents" },
        data : { event: JSON.stringify(eventInfo.event), },
      };
      FileMaker.PerformScriptWithOption(
        SCRIPT,
        JSON.stringify(param),
        5
      );
    }
  */
  // change the border color just for fun
  //info.el.style.borderColor = "blue";
}

function newModal(element, event) {

  /*
  View Event
  title
  event.extendedProps.status
  start
  end
  event.extendedProps.resources
  event.extendedProps.account
  event.extendedProps.notes
  event.startEditable || event.durationEditable
  event.id

  Confirm New Event
  <button type="button" class="btn btn-warning" data-bs-dismiss="modal">Cancel</button>
  <button type="button" onclick="newEvent()" class="btn btn-primary" data-bs-dismiss="modal">Confirm</button>

  Confirm Update
  <button type="button" onclick="revert_EVENT()"  class="btn btn-warning" data-bs-dismiss="modal">Cancel</button>
  <button type="button" onclick="updateEvent('${event.id}',true)" class="btn btn-secondary" data-bs-dismiss="modal">Confirm and Notify</button>
  <button type="button" onclick="updateEvent('${event.id}')" class="btn btn-primary" data-bs-dismiss="modal">Confirm</button>
  */


  let event = eventInfo.event;
  let rangeFormat = {
    hour: "numeric",
    minute: "2-digit"
  };
  if (event.start.getDate() != event.end.getDate()) {
    rangeFormat = {
      ...rangeFormat,
      month: "numeric",
      day: "2-digit"
    };
  };
  let range = `<div>${event.formatRange(rangeFormat)}</div`;

  let resources = "";
  if (event.extendedProps.resources.length !== 0) {
    event.extendedProps.resources.forEach((resource) => {
      resources += `<li>${resource.title}</li>`;
    });
    resources = `<div class="mt-2">Resources:</div>
    <ul>${resources}</ul>`;
  };

  let account = event.extendedProps.account ? `
    <div class="mt-1">Charge Code: ${event.extendedProps.account}</div>
    ` : "";

  let notes = event.extendedProps.notes ? `
    <div class="popover-label-sm mt-2">Notes</div>
    <div class="popover-notes mb-2"><em>${event.extendedProps.notes}</em></div>
    ` : "";

  const contentHeader = `
    <div class="modal-header">
      <h5 class="modal-title" id="eventTitle">${event.title}</h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
    </div>`;
  const contentBody = `
    <div class="modal-body">
      <div><strong>${event.extendedProps.status}</strong></div>
      <div>${range}</div>
      ${account}
      ${resources}
      ${notes}
    </div>`;
  const contentFooter = event.startEditable || event.durationEditable ? `
      <div class="modal-footer justify-content-between">
        <button id="eventDelete" onclick="deleteEvent('${event.id}')" type="button" class="btn btn-danger" data-bs-dismiss="modal">Delete</button>
        <button id="eventEdit" onclick="editEvent('${event.id}')" type="button" class="btn btn-primary" data-bs-dismiss="modal">Edit</button>
      </div>` : "";

  element.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        ${contentHeader}
        ${contentBody}
        ${contentFooter}
      </div>
    </div>`;
}


function eventDidMount(arg) {

  if (arg.isMirror) return true;

  let event = arg.event;
  let rangeFormat = {
    hour: "numeric",
    minute: "2-digit"
  };
  if (event.start.getDate() != event.end.getDate()) {
    rangeFormat = {
      ...rangeFormat,
      month: "numeric",
      day: "2-digit"
    };
  };
  //let range = event.formatRange(rangeFormat);
  let range = `<div>${event.formatRange(rangeFormat)}</div`;

  let resources = "";
  if (event.extendedProps.resources.length !== 0) {
    event.extendedProps.resources.forEach((resource) => {
      resources += `<li>${resource.title}</li>`;
    });
    resources = `<div class="mt-2">Resources:</div>
    <ul>${resources}</ul>`;
  };

  let edit = event.startEditable || event.durationEditable ? `
    <div><i class="bi bi-pencil-fill"></i></div>` : "";

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
  arg.el.setAttribute("data-bs-toggle", "popover");
  arg.el.setAttribute("data-bs-trigger", "hover");
  arg.el.setAttribute("data-bs-placement", "left");
  arg.el.setAttribute("data-bs-html", "true");
  arg.el.setAttribute("data-bs-content", content);
  arg.el.setAttribute("title", `<div class="d-flex justify-content-between"><div>${event.title}</div>${edit}</div>`);

  new bootstrap.Popover(arg.el);
};


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

