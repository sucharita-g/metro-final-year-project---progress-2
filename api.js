
/*
// importing fetch or axios to make HTTP requests and get the stations data 

//const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const axios = require("axios");


// function to call stations using the async function
async function getStations() {
  const url = "http://localhost:3000/stations?source=TRL&destination=CBT&line=Green";
  try {
    const response = await fetch(url); // or await axios.get(url);
    if (!response.ok) {
      throw new Error("response was not ok..!" + response.statusText);
    }
    const data = await response.json();
    return data; // returning the data in json format
  } catch (error) {
    console.error("Error fetching stations:", error.message);
    throw error; // error fetching stations
  }
}

// export the function itself {getStations}, not its result getStations()
module.exports = { getStations };
*/