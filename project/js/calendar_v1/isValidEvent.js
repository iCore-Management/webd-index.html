//import DateUtils from "./utils/DateUtils.js";
//import isSameDay from "date-fns/isSameDay";
//import isAfter from "date-fns/isAfter";
//import isBefore from "date-fns/isBefore";
//import differenceInMilliseconds from "date-fns/differenceInMilliseconds";
//import hoursToMilliseconds from "date-fns/hoursToMilliseconds";

//class CalendarRules {
// Public Fields Note: Private Fields, #field, do not work in FM desktop webviewer
EXIT_SUCCESS = { response: true, message: "OK" };

EXIT_FAILURE = [
  {
    test: "isReservationAfterStartDate",
    response: false,
    message: "Reservation is not after start date",
    // Reservation must be after ${startDate}
  },
  {
    test: "isReservationBeforeEndDate",
    response: false,
    message: "Reservation is not before End date",
    // Reservation must be before ${endDate}
  },
  {
    test: "isReservationOnAvailableDay",
    response: false,
    message: "Reservation is not an available day",
    // Reservation must be during business hours
  },
  {
    test: "isReservationAfterStartTime",
    response: false,
    message: "Reservation is before start time",
    // Reservation must be during business hours
    //const isNonBusinessSlot = Boolean((arg.jsEvent.target as HTMLDivElement).className === 'fc-non-business');
  },
  {
    test: "isReservationBeforeEndTime",
    response: false,
    message: "Reservation is after end time",
    // Reservation must be during business hours
  },
  {
    test: "isReservationAfterOpenDay",
    response: false,
    message: "Reservation is before open day",
    // Reservation must be after ${startDate}
  },
  {
    test: "isReservationBeforeCloseDay",
    response: false,
    message: "Reservation is after close day",
    // Reservation must be before ${endDate}
  },
  {
    test: "doesReservationSpanMultipleDays",
    response: false,
    message: "Reservation spans multiple days",
  },
  {
    test: "isPersonUnderMaxDuration",
    response: false,
    message: "Over maximum allotted duration for the day",
    // Reservation is over user's max hours of ${userHours}
  },
  {
    test: "isNotOverlappingShutdown",
    response: false,
    message: "You cannot overlap a shutdown event",
    // Reservation cannot overlap a shutdown event
  },
  {
    test: "isUnderMaxUsers",
    response: false,
    message: "Too many users",
    // Reservation is over the max users of ${maxUsers}
  },
];
/*
function userAccess(index) {
  // SET PER eventSource
  let extendedHours = SETTINGS.eventSources[index].extendedHours ? SETTINGS.eventSources[index].extendedHours : [];
  let access = extendedHours.includes(SETTINGS.USER.id) ? "extendedHours" : "user";
  let admins = SETTINGS.eventSources[index].admins ? SETTINGS.eventSources[index].admins : [];
  access = admins.includes(SETTINGS.USER.id) ? "admin" : access;

  return access;
}
*/


function isEventAfterStart(event) {
  //START DEPENDS ON USER

  let eventConstraint = calendar.getOption("eventConstraint"); // ALWAYS INCLUDE THE MINIMUM START TO END
  // MODIFIED TO USER ACCESS
  let start = eventConstraint.start;

  if ( start ) response = (event.start >= start);
  else response = true;

  return {response: response, message:`Reservation must be after ${getTimestampString(start)}`};
}
function isEventBeforeEnd(event){
  //END DEPENDS ON USER

  let eventConstraint = calendar.getOption("eventConstraint"); // ALWAYS INCLUDE THE MINIMUM start to end
  // MODIFIED TO USER ACCESS
  let end = eventConstraint.end;
  // MODIFIED TO USER ACCESS

  if ( end ) response = (event.end <= end);
  else response = true;
//  console.log(response);
  return {response: response, message:`Reservation must be before ${getTimestampString(end)}`};
}
function isEventDuringBusinessHours(event){
  // DropInfo {start, end}
  let result = {response: false, message:`Reservation must be during business hours`};

  let eventConstraint = calendar.getOption("businessHours");
  if (eventConstraint == true) {
    eventConstraint = {
      // days of week. an array of zero-based day of week integers (0=Sunday)
      daysOfWeek: [ 1, 2, 3, 4, 5 ], // Monday - Friday
      startTime: '9:00', // a start time (10am in this example)
      endTime: '17:00', // an end time (6pm in this example)
    }
  }
  //NO BUSINESS HOURS, RETURN TRUE
  if ( !eventConstraint ) return {...result, response: true};
  //CHECK BUSINESS DAYS
  //BUSINESSHOURS REMOVED FOR ADMIN AND EXTENDEDHOURS
  if (eventConstraint.daysOfWeek) {
    let days = Math.ceil((event.end.getTime() - event.start.getTime())/(1000*60*60*24));
    console.log(days);
    let inBusinessDays = true;
    let starting = new Date(event.start);
    for (let index = 0; index <= days && inBusinessDays; index++) {
      starting.setDate(starting.getDate()+index);
      if ( starting <= event.end) {
        inBusinessDays = eventConstraint.daysOfWeek.includes(starting.getDay()+index);
        console.log(starting.getDay()+index);
      }
    }

    if ( !inBusinessDays ) return result;
  }

  // CHECK BUSINESS HOURS
  if ( !eventConstraint.startTime && !eventConstraint.endTime ) return {...result, response: true};
  else if ( event.start.toDateString() != event.end.toDateString() ) return result;

  if (eventConstraint.startTime){
    let constraint = new Date(event.start);
    let [hours, minutes] = eventConstraint.startTime.split(":");
    constraint.setHours(hours, minutes);

    if (event.start < constraint ) return result;
  }
  if (eventConstraint.endTime){
    let constraint = new Date(event.end);
    let [hours, minutes] = eventConstraint.endTime.split(":");
    constraint.setHours(hours, minutes);

    if (event.end > constraint ) return result;
  }

  return {...result, response: true};;
}
function isUnderUserHours(dropInfo, draggedEvent) {
  if ( !SETTINGS.calendar.maxUsers ) return true;

  const newEventDuration = end.getMilliseconds() - start.getMilliseconds(); // differenceInMilliseconds(end, start);
  const maxDuration = SETTINGS.calendar.maxUsers * 60 * 60 * 1000; //hoursToMilliseconds(userHours);
  const draggedEventPerson = draggedEvent.extendedProps.person;

  const { start, end } = dropInfo;
  allEvents = calendar.getEvents();
  if (allEvents.length === 0) return newEventDuration <= maxDuration;

  const relevantEvents = allEvents.filter((event) => {
    let eventPerson = event.extendedProps.person;
    let eventStatus = event.extendedProps.status;

    return (
      isSameDay(event.end, end) &&
      eventPerson === draggedEventPerson &&
      event.id !== draggedEvent.id &&
      eventStatus === "Confirmed"
    );
  });





  

  let expectedReservedTime = relevantEvents.reduce((accumulator, event) => {
    const overlap = this.overlapAmount(event, dropInfo);
    // const eventDuration = event.end.getTime() - event.start.getTime();
    const eventDuration = event.end.getMilliseconds() - event.start.getMilliseconds(); //differenceInMilliseconds(event.end, event.start);

    return accumulator + eventDuration - overlap;
  }, newEventDuration);

  if (expectedReservedTime <= maxDuration) return true;

  return false;
}

function getUserHours(user,day){
  allEvents = calendar.getEvents();
  if (allEvents.length === 0) return 0;

  const userEvents = allEvents.filter((event) => {
//    let eventPerson = event.extendedProps.person;
//    let eventStatus = event.extendedProps.status;

    return (
      event.start <= day && event.end >= day &&
      event.extendedProps.person === user &&
      event.id !== draggedEvent.id &&
      event.extendedProps.status === "Confirmed"
    );
  });

  let userDuration = 0
  userEvents.forEach(event => {
    userDuration += event.end.getMilliseconds() - event.start.getMilliseconds()
  });


}
function isOverlapping(event, stillEvent) {
  //  const { start: e1Start, end: e1End } = event;
  //  const { start: e2Start, end: e2End } = stillEvent;
  
    return event.start < stillEvent.end && event.end > stillEvent.start;
  }



function isUnderMaxUsers(dropTime, draggedEvent, allEvents) {
  if (!this.maxUsers) return true;

  let overlappingEvents = 1;
  const currentPerson = draggedEvent.extendedProps.person;

  // Does not filter out events based on day. Could lead to performance issues
  const relevantEvents = allEvents.filter(
    (event) =>
      // Not your own event
      event.extendedProps.person !== currentPerson &&
      // Not an Unattended Operation
      event.extendedProps.status !== "Unattended"
  );

  // Counts number of events overlapping with dropTime
  for (const relevantEvent of relevantEvents) {
    if (this.isOverlapping(relevantEvent, dropTime)) {
      overlappingEvents += 1;
    }

    if (overlappingEvents > this.maxUsers) return false;
  }

  return true;
}







function toaster(message){
  //CREATE MODAL CONFIRMATION
    let content = `<div class="d-flex">
        <div class="toast-body">
          ${message}
        </div>
        <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>`;

    let element;
    if (document.getElementById("toast")) {
      element = document.getElementById("toast");
      element.innerHTML = content;
    } else {
      parent = document.createElement("div");
      parent.innerHTML = `
      <div id="toast" class="toast align-items-center bg-warning" role="alert" aria-live="assertive" aria-atomic="true">
        ${content}
      </div>`;
      document.body.appendChild(
        Object.assign(parent, {
          id: "toaster", className: "toast-container top-0 end-0"
        }));
      element = document.getElementById("toast");
    }
    let toast = bootstrap.Toast.getOrCreateInstance(element);
    toast.show();
}


/*******************
 * UTILITY FUNCTIONS
 * 
 */

function getDate(string) {
  let date = new Date(string);
  if (date instanceof Date && !isNaN(date)) return date;

  return null;
}
function getTimestampString(date){
  formatDate = new Date(date);
  formatTime = {hour:"numeric",minute:"2-digit",};
  return `${formatDate.getMonth()+1}/${formatDate.getDate()}/${formatDate.getFullYear()} ${FullCalendar.formatDate(formatDate, formatTime)}`;
}


























function eventConstraint(index) {
  // SET PER event
  if (SETTINGS.eventSources[index].userAccess == "user" && calendar.getOption("businessHours")) {
//    let businessHours = calendar.getOption("businessHours"); // APPLY TO USERS
//    if (businessHours) {
      return "businessHours";
//    }
  }
/*
  let selectConstraint = calendar.getOption("selectConstraint"); // ALWAYS INCLUDE THE MINIMUM start to end
  //    let eventConstraint = calendar.getOption("eventConstraint"); // PROVIDES USER OPEN CLOSE ["businessHours",{start,end}]
  let businessHours = calendar.getOption("businessHours"); // APPLY TO USERS
  let sourceConstraint = SETTINGS.eventSources[index].constraint; // INCLUDE THE OPEN AND CLOSE SOURCE DATES FOR USERS


  // ONLY APPLY SOURCE CONSTRAINT FOR USERS
  if (SETTINGS.eventSources[index].userAccess == "user") {
    let start, end, constraint;
    let userConstraint = [];
    //CHECK BUSINESS HOURS
    //      let userConstraint = [];
    if (businessHours) {
      userConstraint.push("businessHours");
    }
    let endArray = [selectConstraint.end, sourceConstraint.end];
    //      let endArray = array.filter(Boolean);
    //      console.log(selectConstraint.start);
    //      console.log(selectConstraint.end);
    //      console.log(sourceConstraint.start);
    //      console.log(sourceConstraint.end);
    start = new Date(Math.max.apply(null, [selectConstraint.start, sourceConstraint.start]));
    end = new Date(Math.min.apply(null, endArray.filter(Boolean)));
    //      console.log(sourceConstraint.end);

    userConstraint.push({
      start: start,
      end: end,
    });

    return userConstraint;
    //      console.log(userConstraint);
  } else {
    //      userConstraint = selectConstraint;
    //      calendar.setOption("eventConstraint", userConstraint); //OVERWRITE ADMIN/EXTENDEDHOURS EVENT CONSTRAINT
    return selectConstraint;
  }
  //    console.log(userConstraint);
  //    return userConstraint;
*/
}
function constraint(index) {
  // SER PER eventSource
}
/*
constructor(calendarSettings) {
  const admins = calendarSettings.admins;
  const businessHours = calendarSettings.businessHours;
  const close = calendarSettings.close;
  const open = calendarSettings.open;
  const start = calendarSettings.start;
  const end = calendarSettings.end;
  const initialDate = calendarSettings.initialDate;
  const initialView = calendarSettings.initialView;
  const maxDuration = calendarSettings.maxDuration;
  const maxUsers = calendarSettings.maxUsers;
  const resources = calendarSettings.resources;
  const source = calendarSettings.source;
  const window = calendarSettings.window;
  const extendedHours = calendarSettings.extendedHours;

  this.source = source;

  this.resources = resources;

  // def: No reservations are allowed before the start date
  this.startDate = validDateString(start);

  // def: No reservations are allowed after the end date
  this.endDate = validDateString(end);

  // def: The maximum number of users that can be in the lab at the same time
  this.maxUsers = maxUsers ? maxUsers : undefined;

  // def: The maximum number of hours that a user can reserve the lab in
  // a single day. The hours do not have to be contiguous
  this.maxDuration = maxDuration ? maxDuration : undefined;

  // Set Open Days HOW MANY DAYS FORWARD MUST A RESERVATION BE MADE?
  // 3 = A RESERVATION MUST BE MADE AT LEAST 3 DAYS IN THE FUTURE FROM TODAY
  // -7 = A RESERVATION CAN BE MADE UP TO 7 DAYS IN THE PAST
  // ALLOW EDITS BACK TO THE RESERVATION WINDOW SETTING (CALENDAR.WINDOW)
  this.openDays = open ? getNDaysInFuture(open + 1) : undefined;

  // Set Close Days HOW MANY DAYS FORWARD CAN A RESERVATION BE MADE?
  // 14 = A RESERVATION MUST BE MADE LESS THAN 14 DAYS IN THE FUTURE FROM TODAY
  this.closeDays = close ? getNDaysInPast(end) : undefined;

  // def: Array of people's UUIDs who are allowed to work after hours
  this.extendedHours = extendedHours;

  // def: Array of people's UUIDs who are have admin access to this calendar
  this.admins = admins;

  // def: The date that is displayed when the calendar loads
  this.initialDate = initialDate;

  // def: Full Calendar View that is displayed when the calendar loads
  this.initialView = initialView ? initialView : "timeGridWeek";

  // def: The maximum number of days a user can go back and modify an event
  this.window = window ? window : 14;

  // Specified what days and what times the lab is open.
  // Confirmed reservations cannot be made when the lab is closed.
  this.availableDays = businessHours[0]?.daysOfWeek || undefined;
  this.startTime = businessHours[0]?.startTime || undefined;
  this.endTime = businessHours[0]?.endTime || undefined;
}

function isOverlapping(event, stillEvent) {
//  const { start: e1Start, end: e1End } = event;
//  const { start: e2Start, end: e2End } = stillEvent;

  return event.start < stillEvent.end && event.end > stillEvent.start;
}
*/
function overlapAmount(event, stillEvent) {
  const doesOverlap = isOverlapping(event, stillEvent);

  if (doesOverlap) {
    const { start: e1Start, end: e1End } = event;
    const { start: e2Start, end: e2End } = stillEvent;

    const overlapTime = [
      e1End - e1Start,
      e1End - e2Start,
      e2End - e2Start,
      e2End - e2Start,
    ];

    return Math.min.apply(null, overlapTime);
  }

  return 0;
}

// def: returns business hours a format that full calendar can consume
function businessHours() {
  return {
    daysOfWeek: this.availableDays || [0, 1, 2, 3, 4, 5, 6],
    startTime: this.startTime || "00:00",
    endTime: this.endTime || "24:00",
  };
}

function getUserAccessLevel(user) {
  if (this.admins.includes(user)) return "admin";

  if (this.extendedHours.includes(user)) return "extended";

  return "user";
}

function isReservationAfterStartDate(dropInfo) {
  if (!this.startDate) return true;

  return isAfter(dropInfo.start, this.startDate);
}

function isReservationBeforeEndDate(dropInfo) {
  if (!this.endDate) return true;

  return isBefore(dropInfo.end, this.endDate);
}

function isReservationOnAvailableDay(dropInfo) {
  if (!this.availableDays) return true;

  const startDay = dropInfo.start.getDay();
  const endDay = dropInfo.end.getDay();

  if (!this.availableDays.includes(startDay)) return false;
  if (!this.availableDays.includes(endDay)) return false;

  return true;
}

function isReservationAfterStartTime(dropInfo) {
  if (!this.startTime) return true;

  const { start, end } = dropInfo;

  if (this.doesReservationSpanMultipleDays(dropInfo)) return false;
  if (!isAfterTime(start, this.startTime)) return false;
  if (!isAfterTime(end, this.startTime)) return false;

  return true;
}

function isReservationBeforeEndTime(dropInfo) {
  if (!this.endTime) return true;

  const { start, end } = dropInfo;

  if (this.doesReservationSpanMultipleDays(dropInfo)) return false;
  if (!isBeforeTime(start, this.endTime)) return false;
  if (!isBeforeTime(end, this.endTime)) return false;

  return true;
}

function isReservationAfterOpenDay(dropInfo) {
  if (!this.openDays) return true;

  const { start, end } = dropInfo;

  if (!isAfterTime(start, this.openDays)) return false;
  if (!isAfterTime(end, this.openDays)) return false;

  return true;
}

function isReservationBeforeCloseDay(dropInfo) {
  if (!this.closeDays) return true;

  const { start, end } = dropInfo;

  if (!isBeforeTime(start, this.closeDays)) return false;
  if (!isBeforeTime(end, this.closeDays)) return false;

  return true;
}

function isSameDay(start, end) {
  return start.getDate() == end.getDate() && start.getMonth() == end.getMonth() && start.getFullYear() == end.getFullYear();
}

function doesReservationSpanMultipleDays(dropInfo) {
  const { start, end } = dropInfo;

  return !isSameDay(start, end);
}

// Returns true if the number of hours a user has reserved is less than the number of hours specified by maxDuration
// If the user has multiple overlapping reservations, then only the


function isNotOverlappingShutdown(dropTime, draggedEvent, allEvents) {
  const shutdownEvents = allEvents.filter(
    (event) => event.extendedProps.status === "Shutdown"
  );

  for (const shutdownEvent of shutdownEvents) {
    if (this.isOverlapping(shutdownEvent, dropTime)) return false;
  }

  return true;
}



function performTests(eventInfo, tests) {
  let { dropInfo } = eventInfo;
  let { draggedEvent } = eventInfo;
  let { allEvents } = eventInfo;

  for (const test of tests) {
    let result = this[test](dropInfo, draggedEvent, allEvents);

    if (!result) {
      return EXIT_FAILURE.find((failures) => {
        return failures.test === test;
      });
    }
  }

  return EXIT_SUCCESS;
}

function isDroppable(eventInfo, user) {
  let userAccessLevel = this.getUserAccessLevel(user);
  let currentEventStatus = eventInfo.draggedEvent.extendedProps.status;

  // If the user is a DAR or lab supervisor, they can make reservations whenever;
  if (userAccessLevel === "admin") return EXIT_SUCCESS;

  let tests = new Set();
  switch (currentEventStatus) {
    case "Confirmed":
      tests.add("isReservationAfterStartDate");
      tests.add("isReservationBeforeEndDate");
      tests.add("isReservationOnAvailableDay");
      tests.add("isReservationAfterOpenDay");
      tests.add("isReservationBeforeCloseDay");
      tests.add("isPersonUnderMaxDuration");
      tests.add("isNotOverlappingShutdown");
      tests.add("isUnderMaxUsers");

      if (userAccessLevel === "user") {
        tests.add("isReservationAfterStartTime");
        tests.add("isReservationBeforeEndTime");
      }
      break;
    case "Unattended":
      tests.add("isReservationAfterStartDate");
      tests.add("isReservationBeforeEndDate");
      tests.add("isNotOverlappingShutdown");
      break;
    case "Support":
      tests.add("isUnderMaxUsers");
    case "Canceled":
    case "Shutdown":
      return EXIT_SUCCESS;
  }

  return this.performTests(eventInfo, Array.from(tests));
}












function getTodayStart() {
  let start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  return start;
}

function getNDaysInPast(numberOfDays) {
  let date = getTodayStart();
  date.setDate(date.getDate() - numberOfDays);

  return date;
}

function getNDaysInFuture(numberOfDays) {
  let date = getTodayStart();
  date.setDate(date.getDate() + numberOfDays);

  return date;
}

function validDateString(string) {
  let date = new Date(string);

  if (date instanceof Date && !isNaN(date)) return date;

  return undefined;
}

function getTimeString(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes();

  return `${hours}:${minutes}`;
}

function timeStringToMinutes(timeString) {
  let [hours, minutes] = timeString.split(":");
  hours = parseInt(hours);
  minutes = parseInt(minutes);

  const minutesInHour = 60;

  return hours * minutesInHour + minutes;
}

function compareTime(date, comparatorString, beforeAfter) {
  let timestring = getTimeString(date);
  let timeMinutes = timeStringToMinutes(timestring);
  let comparatorMinutes = timeStringToMinutes(comparatorString);

  if (beforeAfter === "after") {
    return timeMinutes >= comparatorMinutes;
  }

  return timeMinutes <= comparatorMinutes;
}

function isAfterTime(date, limit) {
  let flag = "after";

  return compareTime(date, limit, flag);
}

function isBeforeTime(date, limit) {
  let flag = "before";

  return compareTime(date, limit, flag);
}
