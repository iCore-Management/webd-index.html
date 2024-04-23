const CALLBACK = "FM_CALLBACK";
/**
 * fetch result queue mapper
 * @private
 */
const __FETCH_RESULTS__ = {};
window[CALLBACK] = (results, fetchId) => {
  let x = __FETCH_RESULTS__[fetchId];
  if (x === "PENDING") {
    try {
      results = JSON.parse(results);
    } catch (e) { }
    __FETCH_RESULTS__[fetchId] = results;
  }
};

/**
 *
 * Run a script in FileMaker and return a promise for the result
 *
 * @param {string} script the name of the script to call
 * @param {Object} data the data to pass; {method:"action"; keys:values}
 * @param {Object} config
 * @param {Number} [config.timeOut=30000] timeout default is 30000 ms
 * @param {String} [config.eventType=null] an optional top level key to specific different types of events
 * @returns {Promise} a promise
 */

function PerformCallback(
  script,
  param = { method: "callback" },
  config = { timeOut: 3000, scriptOption: 5 }
) {
  const fetchId = script + Date.now(); //GET A UUIDish
  __FETCH_RESULTS__[fetchId] = "PENDING";

  param.config.promise = fetchId;
  param.config.function = CALLBACK;

  FileMaker.PerformScriptWithOption(
    script,
    JSON.stringify(param),
    config.scriptOption,
  );

  return new Promise((resolve, reject) => {
    let result = __FETCH_RESULTS__[fetchId];

    let int = setInterval(() => {
      result = __FETCH_RESULTS__[fetchId];
      if (result !== "PENDING") {
        clearInterval(int);
        delete __FETCH_RESULTS__[fetchId];
        resolve(result);
      }
      if (timeOut) {
        clearInterval(int);
        delete __FETCH_RESULTS__[fetchId];
        reject(new Error("fmCallback timeout at " + timeOut/1000 + "s"));
      }
    }, 100);

    let timeOut = false;
    setTimeout(() => {
      timeOut = true;
    }, config.timeOut);
  });
}