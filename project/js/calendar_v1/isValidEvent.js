import { fmFetch } from "./utils/fmw-utils-custom.js";

import Reservation from "./reservations/Reservation.js";
import ReservationFields from "./reservations/ReservationFields.js";
import FMReport from "./utils/FMReport.js";

function createQuery(action, source, querySettings, { start, end }) {
  const startDateField = querySettings.startDateField.split("::")[1];
  const sourceField = querySettings.sourceField.split("::")[1];
  const endDateField = querySettings.endDateField.split("::")[1];

  const dateStart = start.toLocaleDateString();
  const dateEnd = end.toLocaleDateString();

  return {
    action: action,
    dataApi: {
      layouts: querySettings.layout,
      limit: 1000,
      offset: 1,
      query: [
        {
          [startDateField]: `${dateStart}...${dateEnd}`,
          [sourceField]: `=${source}`,
        },
        {
          [endDateField]: `${dateStart}...${dateEnd}`,
          [sourceField]: `=${source}`,
        },
      ],
    },
  };
}

// def:
async function eventLoader(fetchInfo, options) {
  const { querySettings } = options;
  const { eventSettings } = options;
  const { scriptName } = options;
  const { user } = options;
  const { rules } = options;
  const { source } = rules;

  let query = createQuery("get Data", source, querySettings, fetchInfo);
  let config = new ReservationFields(eventSettings, querySettings.layout);

  let response = await fmFetch(scriptName, query, {
    timeOut: 30000,
    scriptOption: 5,
    eventType: "getData",
  });

  let events = new FMReport(response, {
    formatter: (record) => {
      let reservation = new Reservation(record, config, rules, user);

      return reservation.FullCalendarEvent;
    },
  });

  if (events.report) {
    return events.report;
  } else {
    return events.messages[0];
  }
}

export default eventLoader;
