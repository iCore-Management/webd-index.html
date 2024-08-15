EXIT_SUCCESS = { response: true, message: "OK" };

function isValid(event) {
// {start, end, extendedProps.person, extendedProps.status}
  let isDuration = isValidDuration(event);
  if (!isDuration.response) return isDuration;

  let isAfterStart = isEventAfterStart(event);
  if (!isAfterStart.response) return isAfterStart;
//console.log(isAfterStart);
  let isAboveMinimum = isEventAboveMinimum(event);
  if (!isAboveMinimum.response) return isAboveMinimum;

  let isBeforeEnd = isEventBeforeEnd(event);
  if (!isBeforeEnd.response) return isBeforeEnd;

  let isUnderMax = isUnderMaxUsers(event);
  if (!isUnderMax.response) return isUnderMax;

  // CURRENTLY IN EVENT CONSTRAINT AND SELECT CONSTRAINT FOR USERS
  let isDuringBusinessHours = isEventDuringBusinessHours(event);
  if (!isDuringBusinessHours.response) return isDuringBusinessHours;

  let isBelowMaximum = isEventBelowMaximum(event);
  if (!isBelowMaximum.response) return isBelowMaximum;

  let isUnderHours = isUnderUserHours(event);
  if (!isUnderHours.response) return isUnderHours;

  return EXIT_SUCCESS;
}


// START AND MINIMUM ARE ALWAYS ENFORCED
// BUSINESSHOURS, END, AND MAXIMUM ARE IGNORED FOR PERSON = EXTENDED HOURS OR USER = ADMIN

function isValidDuration (event) {
  const EXIT_FAILURE = { response: false, message: `Reservation end must be after it starts` };
  return { ...EXIT_FAILURE, response: event.start < event.end };
}
function isEventAfterStart(event) {
//  console.log(event);
  // {start, constraint? if not set use calendar.eventConstraint }
  // SELECTION, DATECLICK, NEWEVENT DON'T HAVE EVENT.CONSTRAINT, EVENT.SOURCE.CONSTRAINT
  // EVENTCONSTRAINT MIGHT BE SET TO BUSINESSHOURS FOR USER
  // WHAT TO USE FOR START CONSTRAINT? SETTINGS.SOURCES[0].constraint
//  let eventConstraint = event.constraint ? event.constraint : calendar.getOption("eventConstraint"); //SET FOR USERS TO SOURCECONSTRAINT {OPEN, CLOSE}
  let eventConstraint = SETTINGS.CALENDAR.window ? SETTINGS.CALENDAR.window : calendar.getOption("eventConstraint");
  // WHEN eventConstraint set to "businessHours", event.constraint set to {open,close}
//  if ( eventConstraint = "businessHours" ) eventConstraint = SETTINGS.SOURCES[0].constraint;
  const START = getDate(eventConstraint.start);
//  console.log(START);
//  console.log(eventConstraint);
//  console.log(calendar.getOption("eventConstraint"));
  if (!START) return EXIT_SUCCESS;
  const EXIT_FAILURE = { response: false, message: `Reservation must be after ${getTimestampString(START)}` };

  return { ...EXIT_FAILURE, response: event.start >= START };
}
function isEventBeforeEnd(event) {
  // {end, constraint? if not set use calendar.eventConstraint}

  let eventConstraint = event.constraint ? event.constraint : calendar.getOption("eventConstraint"); //SET FOR USERS TO SOURCECONSTRAINT {OPEN, CLOSE}
//  if ( eventConstraint = "businessHours" ) eventConstraint = SETTINGS.SOURCES[0].constraint;
  const END = getDate(eventConstraint.end);

  if (!END) return EXIT_SUCCESS;
  const EXIT_FAILURE = { response: false, message: `Reservation must be before ${getTimestampString(END)}` };

  return { ...EXIT_FAILURE, response: event.end <= END };
}
function isEventDuringBusinessDay(event) {
  // {start, end}
  // USED TO CHECK SELECTION FOR USER WHEN DATECLICK OR ISVALID EVENT
  const EXIT_FAILURE = { response: false, message: `Reservation must be on business days` };

  let eventConstraint = calendar.getOption("businessHours");
  if (!eventConstraint) return EXIT_SUCCESS;
  if (eventConstraint == true) {
    eventConstraint = {
      // days of week. an array of zero-based day of week integers (0=Sunday)
      daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
      startTime: '9:00', // a start time (9am in this example)
      endTime: '17:00', // an end time (5pm in this example)
    }
  }

  //CHECK BUSINESS DAYS
  if (eventConstraint.daysOfWeek) {
    let days = getEventDays(event).length;
    let inBusinessDays = true;
    let starting = new Date(event.start);
    for (let index = 0; index <= days && inBusinessDays; index++) {
      starting.setDate(starting.getDate() + index);
      if (starting <= event.end) {
        inBusinessDays = eventConstraint.daysOfWeek.includes(starting.getDay() + index);
      }
    }
    if (!inBusinessDays) return EXIT_FAILURE;
  }
  return EXIT_SUCCESS;
}
function isEventDuringBusinessHours(event) {
  // {start, end}
  // USED TO CHECK SELECTION FOR USER WHEN DATECLICK OR ISVALID EVENT
  const EXIT_FAILURE = { response: false, message: `Reservation must be during business hours` };

  let inBusinessDays = isEventDuringBusinessDay(event);
  if (!inBusinessDays.response) return inBusinessDays;

  let eventConstraint = calendar.getOption("businessHours");
  if (!eventConstraint) return EXIT_SUCCESS;
  if (eventConstraint == true) {
    eventConstraint = {
      // days of week. an array of zero-based day of week integers (0=Sunday)
      daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
      startTime: '9:00', // a start time (9am in this example)
      endTime: '17:00', // an end time (5pm in this example)
    }
  }

  // CHECK BUSINESS HOURS
  if (!eventConstraint.startTime && !eventConstraint.endTime) return EXIT_SUCCESS;
  else if (event.start.toDateString() != event.end.toDateString()) return EXIT_FAILURE;

  if (eventConstraint.startTime) {
    let constraint = new Date(event.start);
    let [hours, minutes] = eventConstraint.startTime.split(":");
    constraint.setHours(hours, minutes);

    if (event.start < constraint) return EXIT_FAILURE;
  }
  if (eventConstraint.endTime) {
    let constraint = new Date(event.end);
    let [hours, minutes] = eventConstraint.endTime.split(":");
    constraint.setHours(hours, minutes);

    if (event.end > constraint) return EXIT_FAILURE;
  }

  return EXIT_SUCCESS;
}
function isEventAboveMinimum(event) {
  // {start, end}
  // USE SOURCE IF NOT SELECTION
  let minTime = event.source ? event.source?.internalEventSource.extendedProps.minTime : SETTINGS.SOURCES[0].minTime;
  const EXIT_FAILURE = { response: false, message: `Reservation must be greater than ${minTime} minutes` };

  if (!minTime) return EXIT_SUCCESS;

  let minMilliseconds = minTime * 60 * 1000;
  let eventMilliseconds = event.end.getTime() - event.start.getTime();

  return { ...EXIT_FAILURE, response: eventMilliseconds >= minMilliseconds };
}
function isEventBelowMaximum(event) {
  // {start, end, extendedProps.person, extendedProps.status}
  // USE SOURCE IF NOT SELECTION
  let maxTime = event.source ? event.source.internalEventSource.extendedProps.minTime : SETTINGS.SOURCES[0].maxTime;
  const EXIT_FAILURE = { response: false, message: `Reservation must be less than ${maxTime} minutes` };
  let person = event.extendedProps?.person ? event.extendedProps.person : SETTINGS.USER.id;

  // IGNORE FOR ADMIN USERS AND IF PERSON IS IN EXTENDED HOURS
  if (!maxTime || SETTINGS.USER.access == "admin" || SETTINGS.CALENDAR.extendedHours.includes(person)) return EXIT_SUCCESS;
  // IGNORE FOR SUPPORT, UNATTENDED, SHUTDOWN, CANCELED (!=Confirmed)
  if (event.extendedProps?.status && event.extendedProps?.status != EVENT_STATUS.normal) return EXIT_SUCCESS;

  let maxMilliseconds = maxTime * 60 * 1000;
  let eventMilliseconds = event.end.getTime() - event.start.getTime();

  return { ...EXIT_FAILURE, response: eventMilliseconds <= maxMilliseconds };
}
function isUnderUserHours(event) {
  // {start, end, extendedProps.person, extendedProps.status}
  // USE EVENT.SOURCE.USERHOURS IF NOT SELECTION, SOURCE[0].userHours IF SELECTION
  // USE EVENT.PERSON IF NOT SELECTION, USER IF SELECTION, 
  let userHours = event.source ? event.source.internalEventSource.extendedProps.userHours : SETTINGS.SOURCES[0].userHours;
  const EXIT_FAILURE = { response: false, message: `User reservations must be less than ${userHours} hours per day` };
  let person = event.extendedProps?.person ? event.extendedProps.person : SETTINGS.USER.id;

  // IGNORE FOR ADMIN USERS AND IF PERSON IS IN EXTENDED HOURS
  if (!userHours || SETTINGS.USER.access == "admin" || SETTINGS.CALENDAR.extendedHours.includes(person)) return EXIT_SUCCESS;
  // IGNORE FOR UNATTENDED RESERVATIONS ??
  if (event.extendedProps?.status == EVENT_STATUS.unattended) return EXIT_SUCCESS;

//  const newEventDuration = event.end.getTime() - event.start.getTime();
  const maxDuration = userHours * 60 * 60 * 1000; //hoursToMilliseconds(userHours);
  const eventMilliseconds = event.end.getTime() - event.start.getTime();

  if (eventMilliseconds > maxDuration) return EXIT_FAILURE;

  let totalHours = getUserHours(event);
  return { ...EXIT_FAILURE, response: totalHours * 60 * 60 * 1000 <= maxDuration };
}
function isUnderMaxUsers(event) {
  // {start, end, id, extendedProps.person, extendedProps.status}
  // USE SOURCE IF NOT SELECTION
  let maxUsers = event.source ? event.source.internalEventSource.extendedProps.maxUsers : SETTINGS.SOURCES[0].maxUsers;
  const EXIT_FAILURE = { response: false, message: `Maximum number of users must be less than ${maxUsers}` };
  let person = event.extendedProps?.person ? event.extendedProps.person : SETTINGS.USER.id;

  if (!maxUsers) return EXIT_SUCCESS;
  if (event.extendedProps?.status && event.extendedProps?.status == EVENT_STATUS.unattended) return EXIT_SUCCESS;

  // GET ALL OVERLAPPING RESERVATIONS NOT THIS PERSON OR UNATTENDED
  const overlappingEvents = calendar.getEvents().filter((element) => {
    return (
      element.end > event.start && element.start < event.end &&
      element.id !== event.id &&
      element.extendedProps.person !== person &&
      element.extendedProps.status !== EVENT_STATUS.unattended
    );
  });

  let userTotals = [1];
  overlappingEvents.forEach((element, index, array) => {
    let userCount = [person];

    let overlap = { start: new Date(Math.max(event.start, element.start)), end: new Date(Math.min(event.end, element.end)) };
    if (!userCount.includes(element.extendedProps.person)) userCount.push(element.extendedProps.person);

    for (i = index + 1; i < array.length; i++) {
      let compare = array[i];

      if (!userCount.includes(compare.extendedProps.person) && getEventOverlap(overlap, compare)) userCount.push(compare.extendedProps.person);
    }
    userTotals[index] = userCount.length;
  });

  return { ...EXIT_FAILURE, response: Math.max(userTotals) <= maxUsers };
}

function getEventDays(event) {
  // {start, end}
  //RETURN AN ARRAY OF DATES
  let inDays = [];
  let starting = new Date(event.start);
  let ending = new Date(event.end);
  starting.setHours(0, 0, 0, 0);
  ending.setHours(24, 0, 0, 0);

  for (let index = 1; starting.getTime() < ending.getTime(); index++) {
    inDays.push(new Date(starting));
    starting.setDate(starting.getDate() + index);
  }

  return inDays
}
/* USE GET EVENT OVERLAP = 0
function isOverlapping(event, stillEvent) {
     return event.start < stillEvent.end && event.end > stillEvent.start;
  }
*/
function getEventOverlap(event, stillEvent) {
  // {start, end}
  const { start: s1, end: e1 } = event;
  const { start: s2, end: e2 } = stillEvent;

  return Math.max(Math.min(e1, e2) - Math.max(s1, s2), 0);
}
function getUserHours(event) {
  // {start, end, id, extendedProps.person}
  let days = getEventDays(event);

  let person = event.extendedProps?.person ? event.extendedProps.person : SETTINGS.USER.id;
  let from = new Date(days[0]).setHours(0, 0, 0, 0);
  let until = new Date(days[days.length - 1]).setHours(24, 0, 0, 0);
  const userEvents = calendar.getEvents().filter((element) => {

    return (
      // CHECK ALL DAYS FOR SPAN??
      element.end > from && element.start < until &&
      element.id !== event.id &&
      element.extendedProps.person === person &&
      element.extendedProps.status === EVENT_STATUS.normal
    );
  });

  if (userEvents.length === 0) return Math.min(24, (event.end.getTime() - event.start.getTime()) / 60 / 60 / 1000);

  userEvents.push(event);
  let maxHours = [];
  let userDuration = 0;
  let userOverlap = 0;
  days.forEach(element => {

    let startDay = new Date(element).setHours(0, 0, 0, 0);
    let endDay = new Date(element).setHours(24, 0, 0, 0);

    let overlapping = [];
    userEvents.forEach((event, index, array) => {

      if (event.end > startDay && event.start < endDay) {
        // CAPPED AT 24 HOURS
        userDuration += Math.min(24 * 60 * 60 * 1000, event.end.getTime() - event.start.getTime());

        for (i = index + 1; i < array.length; i++) {
          let compare = array[i];
          let overlap = getEventOverlap(event, compare);
          userOverlap += overlap;

          if (overlap > 0 && overlapping[i]) {
            compare = overlapping[i];
            overlap = getEventOverlap(event, compare);
            userOverlap -= overlap;
          }
          if (overlap > 0) {
            overlapping[i] = { start: new Date(Math.max(event.start, compare.start)), end: new Date(Math.min(event.end, compare.end)) };
          }
        }
      }
    });
    maxHours.push(userDuration - userOverlap);

  });

  return (Math.max(maxHours)) / 60 / 60 / 1000
}


function toaster(message) {
  //CREATE TOAST
  let element;
  let content = `
    <div class="toast-body d-flex justify-content-between">
      <div>${message}</div>
      <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>`;

  if (document.getElementById("warning")) {
    element = document.getElementById("warning");
  } else {
    parent = document.createElement("div");
    parent.setAttribute("class", "toast-container top-0 end-0 p-3");

    element = document.createElement("div");
    element.setAttribute("id", "warning");
    element.setAttribute("class", "toast align-items-center bg-warning");
    element.setAttribute("role", "alert");
    element.setAttribute("aria-live", "assertive");
    element.setAttribute("aria-atomic", "true");
    //      element.setAttribute("data-bs-autohide", "false");

    parent.appendChild(element);
    document.body.appendChild(parent);
  }
  element.innerHTML = content;

  let toast = bootstrap.Toast.getOrCreateInstance(element);
  if (!toast.isShown()) toast.show();
}
function hideWarning() {
  if (document.getElementById("warning")) {
    element = document.getElementById("warning");
    let toast = bootstrap.Toast.getOrCreateInstance(element);
    if (toast.isShown()) toast.hide();
  }
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
function getTimestampString(date) {
  formatDate = new Date(date);
  formatTime = { hour: "numeric", minute: "2-digit", };
  return `${formatDate.getMonth() + 1}/${formatDate.getDate()}/${formatDate.getFullYear()} ${FullCalendar.formatDate(formatDate, formatTime)}`;
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
