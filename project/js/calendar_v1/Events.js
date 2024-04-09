
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

async function events (fetchInfo, successCallback, failureCallback){
  let result = await fetchEvents(fetchInfo);

  if ( result.messages[0].code == 0 ) {
//    console.log(result.response.dataInfo.foundCount + " Events found");
    successCallback(result);
  } else if ( result.messages[0].code == 401 ) {
    //OK, records not found
    failureCallback();
  } else {
    failureCallback(result.messages[0]);
//    failureCallback();
  }
}
function fetchEvents (fetchInfo){

  //QUERY FROM fetchINFO, needs Layout (and table?) comes from query results...
  let transform = SETTINGS.EVENT_FIELDS;
  const startDate = fetchInfo.start.toLocaleDateString();
  const endDate = fetchInfo.end.toLocaleDateString();

  //source is an Event Source id
  const source = SETTINGS.SOURCES[fetchInfo.source].id;
  const layout = transform._layout;
//  const layout = calendar.getEventSourceById("sourceID").internalEventSource.extendedProps.layout;

  let dataAPI = {
    layouts: layout,
    limit: 1000,
    offset: 1,
    query: [
      {
        [transform.start]: `${startDate}...${endDate}`,
        [transform._source]: `${source}`,
      },
      {
        [transform.end]: `${startDate}...${endDate}`,
        [transform._source]: `${source}`,
      },
    ],
  };

  let param = { 
    method : API + ".fetchEvents",
    config : { webviewer : WEBVIEWER, callback : "" },
    data : { query: dataAPI, },
  };
  let events = PerformCallback(SCRIPT, param, {
    timeOut: 30000,
    scriptOption: 5
  });

return events;
}
function eventSourceSuccess(rawEvents, response){
  //TRANFORM rawEvents TO AN ARRAY and RETURN
  //PROCESS SOME BASIC MAP BEFORE eventDataTransform?
  //result = arr.map(({pageIndex: id, pageName: name}) => ({id, name}));

  let result = rawEvents.response.data;
/*  result = events.map( ({
    pageIndex: id,
    pageName: name
    }) => ({id, name}) )
*/
/*
MAP PASSES AN OBJECT, I NEED TO MAP THAT OBJECT
object.map({key,value}) => { 
  { object...,

  }
}
!!!
    let transform = SETTINGS.EVENT_FIELDS;
    result.map(object) => {
      transform.map({key,value}) => {
        {
          key : object[transform[key]],
        }
      } }

    let transform = SETTINGS.EVENT_FIELDS;
    result = events.map( (object) => {
      let event = object.fieldData;
      let FCEvent = {};
      for (const key in transform) {
        if (Object.hasOwnProperty.call(transform, key)) {
          FCEvent[key] = event[transform[key]];
        }
      };
      FCEvent.start = new Date(event[transform.startStr]);
      FCEvent.end = new Date(event[transform.endStr]);
//      FCEvent.status = event["isEditing"] ? "EDITING" : result.status;
JUST PASS STATUS = EDITING WHEN ON CURRENT RECORD???
      return FCEvent;
    } )
*/
  return result;

//{"response":{},"messages":[{"code":"401","message":"No records match the request"}]}
//{"response":{"dataInfo":{"database":"LabTime","layout":"#Event","table":"#Event","totalRecordCount":246635,"foundCount":201,"returnedCount":201},"data":[{"fieldData":{"@UUID":"12382B2A-FF0B-BE42-BB47-3641C33EC29A","start.timestamp":"01/31/2024 09:00:00","end.timestamp":"01/31/2024 17:00:00","name":"Kluherz, Tk","location":"STF.139","account":"","status":"Confirmed","notes":"Cryostat","@fkey source":"9D2A0683-B4F0-9E43-93CC-B35F3229A841\r493F6ABB-76CE-4A1C-BE7F-FC2237453997\rD6BBD78D-239D-4100-81A8-8499CFDB23A7","#Event|Room::_Name":"STF.139","#Event|Person::_Name":"Kluherz, Tk","#Event|Person::@UUID":"9D2A0683-B4F0-9E43-93CC-B35F3229A841","#Event|Person::@fkey.Person":"DB83BC02-6D66-1D42-9598-0D825B04670F","#Event|Person!creator::@UUID":"9D2A0683-B4F0-9E43-93CC-B35F3229A841","#Event|Person::full_name":"Tk Kluherz"},"portalData":{"portal.event.activity":[{"recordId":"89","#Event|Activities::title":"Zone 2 - Princeton PL","#Event|Activities::@UUID":"D6BBD78D-239D-4100-81A8-8499CFDB23A7","?#Event|ACTIVITIES|Reservation!current::@UUID":"","modId":"1"}],"portal.extendedHours":[]},"recordId":"284462","modId":"1","portalDataInfo":[{"portalObjectName":"portal.event.activity","database":"Resops_Data","table":"#Event|Activities","foundCount":1,"returnedCount":1},{"portalObjectName":"portal.extendedHours","database":"Resops_Data","table":"#Event|Room|Locations|Competency|Proficiencies","foundCount":0,"returnedCount":0}]},
// ,"messages":[{"code":"0","message":"OK"}]}
}

function eventDataTransform(eventData){
  //TRANSFORM eventSourceSuccess ARRAY ITEM TO PARSABLE EVENT OBJECT
  // NEEDS transformSettings to map FM fields to FC properties
  let event = eventData.fieldData;
  let transform = SETTINGS.EVENT_FIELDS;

  let result = {};
/*
  FCevent = transform.map({key,value}) => {
    {
      key : event[transform[key]],
    }
  }
*/

  for (const key in transform) {
    if (Object.hasOwnProperty.call(transform, key)) {
      result[key] = event[transform[key]];
    }
  }
  result.start = new Date(event[transform.startStr]);
  result.end = new Date(event[transform.endStr]);
  
  //JUST PASS STATUS = EDITING WHEN ON CURRENT RECORD???
  result.status = event["isEditing"] ? "EDITING" : result.status;
//  result.constraint = [{start:"2024-03-10T00:00:0", end: "2024-4-10T00:00:0"}];


  let response = formatEvent(result);
//  console.log(JSON.stringify(response));

  return response;
};
function formatEvent (event) {
  //COLOR BASED ON STATUS = CONFIRMED | CANCELED | UNATTENDED | SUPPORT
  //COLOR BASED ON STATUS = EDITING
  //DISPLAY BASED ON STATUS = SHUTDOWN

    event.backgroundColor = format[event.status].backgroundColor ? format[event.status].backgroundColor : format['default'].backgroundColor ;
    event.borderColor = format[event.status].borderColor ? format[event.status].borderColor : format['default'].borderColor ;
    event.textColor = format[event.status].textColor ? format[event.status].textColor : format['default'].textColor ;
    event.display = format[event.status].display ? format[event.status].display : 'auto' ;
//    console.log(JSON.stringify(event));

  //EDITABLE BASED ON USER VS EDITORS (ADMINS, PERSON, SUPERVISOR, CREATOR )
  let editors = new Set();
  if (event.person) editors.add(event.person);
  if (event.creator) editors.add(event.creator);
  if (event.supervisor) editors.add(event.supervisor);

  if (SETTINGS.USERS.admins && Array.isArray(SETTINGS.USERS.admins)) {
    SETTINGS.USERS.admins.forEach((admin) => {
      editors.add(admin);
    });
  };

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





  return event;
}



function dateClick(dateInfo){
  //https://fullcalendar.io/docs/dateClick
  //alert("View: " + dateClickInfo.view.type);
  if(dateInfo.view.type == "dayGridMonth" ){ //dayGridWeek | dayGridDay | dayGridYear | multiMonthYear
    //NEW EVENT for day at current time
    if ( confirm("New Event: " + dateInfo.dateStr ) ) {

    let param = { 
      method : API + ".newEvent",
      config : { webviewer : WEBVIEWER, callback : "refetchEvents" },
      data : { date : dateInfo.date, dateStr : dateInfo.dateStr, allDay : dateInfo.allDay,},
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
  //format duration
  if (confirm("New Event: " + selectInfo.startStr)) {

    let param = {
      method: API + ".newEvent",
      config: { webviewer: WEBVIEWER, callback: "refetchEvents" },
      data: { start: selectInfo.start, startStr: selectInfo.startStr, end: selectInfo.end, endStr: selectInfo.endStr, allDay: selectInfo.allDay, },
    };
    FileMaker.PerformScriptWithOption(
      SCRIPT,
      JSON.stringify(param),
      5
    );
  }
};


function eventOverlap(stillEvent, movingEvent){
  //TEST FOR ALLOW OVERLAP
  //MAX OCCUPANTS?
  return true;
};
function eventAllow(dropInfo, draggedEvent){
  return true;
};
function eventChange(eventInfo){
  //https://fullcalendar.io/docs/eventChange
  //UPDATE EVENT
//  alert("Update Event: " + eventInfo.event.start.toString());
  if (!confirm("Update Event: " + eventInfo.event.start.toString())) { eventInfo.revert();
  } else {
    let param = { 
      method : API + ".eventChange",
      config : { webviewer : WEBVIEWER, callback : "" },
      data : { event: JSON.stringify(eventInfo.event), },
    };
    FileMaker.PerformScriptWithOption(
      SCRIPT,
      JSON.stringify(param),
      5
    );
  }
};
function eventRemove(eventInfo){
  //https://fullcalendar.io/docs/eventChange
  //REMOVE EVENT
//  alert("Remove Event: " + eventInfo.event.id);
  if (confirm("Remove Event: " + eventInfo.event.id)) {

    let param = { 
      method : API + ".eventRemove",
      config : { webviewer : WEBVIEWER, callback : "" },
      data : { event: JSON.stringify(eventInfo.event), },
    };
    FileMaker.PerformScriptWithOption(
      SCRIPT,
      JSON.stringify(param),
      5
    );
  }
};

function eventMouseEnter(eventInfo) {};
function eventMouseLeave(eventInfo) {};
function eventClick (eventInfo) {
//  alert("View Event: " + eventInfo.event.id);
  if (confirm("View Event: " + JSON.stringify(eventInfo.event))){

    let param = { 
      method : API + ".eventClick",
      config : { webviewer : WEBVIEWER, callback : "" },
      data : { event: JSON.stringify(eventInfo.event), },
    };
    FileMaker.PerformScriptWithOption(
      SCRIPT,
      JSON.stringify(param),
      5
    );
  }
  // change the border color just for fun
  //info.el.style.borderColor = "blue";
}