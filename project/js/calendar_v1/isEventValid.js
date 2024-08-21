const EXIT_SUCCESS = { response: true, message: "OK" };
const EXIT_FAILURE = { response: false };

function isValid(event) {
// {start, end, extendedProps.person, extendedProps.status}
  let isDuration = isValidDuration(event);
  if (!isDuration.response) return isDuration;

  let isAfterStart = isEventAfterStart(event);
  if (!isAfterStart.response) return isAfterStart;

  let isAboveMinimum = isEventAboveMinimum(event);
  if (!isAboveMinimum.response) return isAboveMinimum;

  let isBeforeEnd = isEventBeforeEnd(event);
  if (!isBeforeEnd.response) return isBeforeEnd;

  let isUnderMax = isUnderMaxUsers(event);
  if (!isUnderMax.response) return isUnderMax;

  // CURRENTLY IN EVENT CONSTRAINT AND SELECT CONSTRAINT FOR USERS ( = 'businessHours' )
  // NEEDS TO VALIDATE FOR NEW FM EVENTS
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
  EXIT_FAILURE.message = `Reservation end must be after it starts`;
  return { ...EXIT_FAILURE, response: event.start < event.end };
}

function isEventAfterStart(event) {
  // {start, constraint? if not set use SETTINGS.CALENDAR.window }
  // SELECTION, DATECLICK, NEWEVENT DON'T HAVE EVENT.CONSTRAINT, EVENT.SOURCE.CONSTRAINT
  // EVENTCONSTRAINT MIGHT BE SET TO BUSINESSHOURS FOR USER
  // WHAT TO USE FOR START CONSTRAINT? SETTINGS.CALENDAR.window

  // WHEN MOVING, EVENT CONSTRAINTS AUTO ENFORCED
  //  if eventConstraint =bh, check window
  //  event.constraint set to source ? source : eventConstraint
  // WHEN ADDING, EVENT CONSTRAINT IS EMPTY
  //  selectConstraint is business hours or window, if bh check window, if window, nothing

  let eventConstraint = SETTINGS.CALENDAR.window;
  //EVENT CONSTRAINT MIGHT BE BUSINESS HOURS
  if (!eventConstraint.start) return EXIT_SUCCESS;
  EXIT_FAILURE.message = `Reservation must be after ${getTimestampString(eventConstraint.start)}`;

  return { ...EXIT_FAILURE, response: event.start >= eventConstraint.start };
}
function isEventBeforeEnd(event) {
  // {end, constraint? if not set use SETTINGS.CALENDAR.window}

  let eventConstraint = SETTINGS.CALENDAR.window;
  //EVENT.CONSTRAINT IS EITHER ALREADY ENFORCED BY JS, OR NULL
  //UNLESS COMING FROM FILEMAKER ISEVENTVALID, MUST CHECK AGAINST BUSINESSHOURS AND WINDOW MANUALLY

  if (!eventConstraint.end) return EXIT_SUCCESS;

  EXIT_FAILURE.message = `Reservation must be before ${getTimestampString(eventConstraint.end)}`;
  return { ...EXIT_FAILURE, response: event.end <= eventConstraint.end };
}
function isEventDuringBusinessDay(event) {
  // {start, end}
  // USED TO CHECK SELECTION FOR USER WHEN DATECLICK OR ISVALID EVENT
  EXIT_FAILURE.response = false;
  EXIT_FAILURE.message = `Reservation must be on business days`;

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
  EXIT_FAILURE.response = false;
  EXIT_FAILURE.message = `Reservation must be during business hours`;

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
  EXIT_FAILURE.message = `Reservation must be greater than ${minTime} minutes`;

  if (!minTime) return EXIT_SUCCESS;

  let minMilliseconds = minTime * 60 * 1000;
  let eventMilliseconds = event.end.getTime() - event.start.getTime();

  return { ...EXIT_FAILURE, response: eventMilliseconds >= minMilliseconds };
}
function isEventBelowMaximum(event) {
  // {start, end, extendedProps.person, extendedProps.status}
  // USE SOURCE IF NOT SELECTION
  let maxTime = event.source ? event.source.internalEventSource.extendedProps.minTime : SETTINGS.SOURCES[0].maxTime;
  EXIT_FAILURE.message = `Reservation must be less than ${maxTime} minutes`;
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
  if ( string && date instanceof Date && !isNaN(date) ) return date;
  return null;
}
function getTimestampString(date) {
  formatDate = new Date(date);
  formatTime = { hour: "numeric", minute: "2-digit", };
  return `${formatDate.getMonth() + 1}/${formatDate.getDate()}/${formatDate.getFullYear()} ${FullCalendar.formatDate(formatDate, formatTime)}`;
}