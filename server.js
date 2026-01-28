// import the express library
const express = require("express");

// importing the uuid library for generating unique IDs for booking endpoint  
const { v4: uuidv4 } = require("uuid");


const QRCode = require("qrcode");



//creating the express application
// This is the main entry point for the server application
const app = express();

// middleware to parse JSON request bodies - booking endpoint
app.use(express.json());

// defining the port number.It sets up the server to listen on a specified port and defines a simple route
const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
/*
// Define a simple route
// This route responds with "Hello World!" when the root URL is accessed
app.get("/", (req, res) => {
  res.send("Hello World!");
}); */

// mongodb connection
const mongoose = require("mongoose");
require("dotenv").config(); // Load environment variables from .env file
const connectDB = require("./src/config/db"); // Import the connectDB function
console.log("Mongo URI:", process.env.MONGO_URI);
connectDB(); // Call the connectDB function to establish a connection to MongoDB


// booking schema for booking endpoint 
const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },
  source: { type: String, required: true },
  destination: { type: String, required: true },
  persons: { type: Number, default: 1 },
  fare: { type: Number, required: true },
  status: {
    type: String,
    enum: ["PENDING", "CONFIRMED", "CANCELLED"],
    default: "PENDING"
  },
  paymentId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model("Bookings", bookingSchema);


// displaying station names
const station_names = [
  { name: "whitefield", code: "WFk", line: "Purple" },
  { name: "Hopefarm", code: "HPC", line: "Purple" },
  { name: "chennai (Madras)", code: "MAS", line: "Purple" },
  { name: "tiruvallur", code: "TRL", line: "Green" },
  { name: "bangalore", code: "BGL", line: "Green" },
  { name: "coimbatore", code: "CBT", line: "Green" },
];

app.get("/name", (req, res) => {
  res.send(station_names);
});

// filtering station names
app.get("/filter", (req, res) => {
  try {
    const searchquery = (req.query.search || "").toLowerCase();

    const filterstation = station_names.filter(function (station) {
      const name = (station.name || "").toLowerCase();
      const code = (station.code || "").toLowerCase();
      return name.includes(searchquery) || code.includes(searchquery);
    });
    res.send(filterstation);
  } catch (error) {
    res.status(500).send("no stations found");
  }
});

// code to print the stations between the source station code and destination code as input using the line

app.get("/stations", (req, res) => {
  try {
    // defining the source and destination query
    const source = (req.query.source || "").toLowerCase();
    const destination = (req.query.destination || "").toLowerCase();
    const line = (req.query.line || "").toLowerCase();

    // if there is no source and destination

    if (!source || !destination || !line) {
      return res.status(500).send("no stations found in this route");
    }

    // filter stations based on line (route)
    const stationsOnLine = station_names.filter(
      (station) => station.line.toLowerCase() === line
    );

    if (stationsOnLine.length === 0) {
      return res.status(404).send("No stations found on this line");
    }

    // finding the index of source and destination
    const sourceIndex = stationsOnLine.findIndex(
      (station) => station.code.toLowerCase() === source
    );
    const destinationIndex = stationsOnLine.findIndex(
      (station) => station.code.toLowerCase() === destination
    );

    // if source and destination index are invalid
    if (sourceIndex === -1 || destinationIndex === -1) {
      return res.status(404).send("Invalid station code");
    }

    // if source and destination are in same route
    const from = Math.min(sourceIndex, destinationIndex);
    const to = Math.max(sourceIndex, destinationIndex);
    /*  const from =
      sourceIndex < destinationIndex ? sourceIndex : destinationIndex;

/*let from, to;
if (sourceIndex < destinationIndex) {
  from = sourceIndex;
  to = destinationIndex;
} else {
  from = destinationIndex;
  to = sourceIndex;
}
*/

    // printing the stations between source and destination

    const stationsInRoute = stationsOnLine.slice(from, to + 1);
    // const distance = Math.abs(destinationIndex - sourceIndex);
    const distance = stationsInRoute.length - 1; // number of stations between source and destination
    res.send(stationsInRoute);
  } catch (error) {
    res.status(500).send("no stations found in this route");
  }
});

/*
app.get("/", (req, res) => {
  res.send("Webservice is running! Use /stations to get data.");
});
*/

const axios = require("axios");

app.get("/stations/fare", async (req, res) => {
  try {
    const source = (req.query.source || "").toLowerCase();
    const destination = (req.query.destination || "").toLowerCase();
    const numberOfPersons = parseInt(req.query.persons) || 1;

    if (!source || !destination) {
      return res.status(400).send("Please provide source and destination");
    }

    // Find source and destination in the global station list
    const sourceIndex = station_names.findIndex(
      (station) => station.code.toLowerCase() === source
    );
    const destinationIndex = station_names.findIndex(
      (station) => station.code.toLowerCase() === destination
    );

    if (sourceIndex === -1 || destinationIndex === -1) {
      return res.status(404).send("Invalid station code");
    }

    // Get the stations between source and destination
    const from = Math.min(sourceIndex, destinationIndex);
    const to = Math.max(sourceIndex, destinationIndex);
    const stationsInRoute = station_names.slice(from, to + 1);

    const distance = stationsInRoute.length - 1;
    const basePrice = 10;
    const baseFarePerPerson = distance * basePrice;
    const totalFare = baseFarePerPerson * numberOfPersons;

    // Surcharges
    const surchargeAmounts = {
      weapons: 50,
      food: 30,
      ticketMissing: 100,
      drinks: 20,
      smoking: 40,
    };

    let totalSurcharge = 0;
    if (req.query.weapons === "true") totalSurcharge += surchargeAmounts.weapons;
    if (req.query.food === "true") totalSurcharge += surchargeAmounts.food;
    if (req.query.ticketMissing === "true") totalSurcharge += surchargeAmounts.ticketMissing;
    if (req.query.drinks === "true") totalSurcharge += surchargeAmounts.drinks;
    if (req.query.smoking === "true") totalSurcharge += surchargeAmounts.smoking;

    const fareWithSurcharge = totalFare + totalSurcharge;

    // Discounts
    let discountPercentage = 0;
    if (req.query.metroCard === "true") discountPercentage += 10;
    if (req.query.student === "true") discountPercentage += 15;
    else if (req.query.senior === "true") discountPercentage += 20;
    if (req.query.appTicket === "true") discountPercentage += 5;
    if (req.query.qrScan === "true") discountPercentage += 5;

    if (discountPercentage > 30) discountPercentage = 30;

    const discountAmount = (fareWithSurcharge * discountPercentage) / 100;
    const finalFare = fareWithSurcharge - discountAmount;
    

    res.json({
      source,
      destination,
      distance,
      stationsInRoute,
      baseFarePerPerson,
      numberOfPersons,
      totalFare,
      fareWithSurcharge,
      discountPercentage,
      discountAmount,
      finalFare,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Error calculating fare");
  }
});


// booking endpoint for creating and storing the booking details in mongodb

app.post("/booking", async (req, res) => {
  try {
    const { source, destination, persons = 1 } = req.body;

    if (!source || !destination) {
      return res.status(400).json({
        message: "Source and destination are required"
      });
    }

    const sourceIndex = station_names.findIndex(
      (s) => s.code.toLowerCase() === source.toLowerCase()
    );
    const destinationIndex = station_names.findIndex(
      (s) => s.code.toLowerCase() === destination.toLowerCase()
    );

    if (sourceIndex === -1 || destinationIndex === -1) {
      return res.status(404).json({
        message: "Invalid station code"
      });
    }

    const distance = Math.abs(destinationIndex - sourceIndex);
    const farePerPerson = distance * 10;
    const totalFare = farePerPerson * persons;

    const bookingId = uuidv4();

    const booking = await Booking.create({
      bookingId,
      source,
      destination,
      persons,
      fare: totalFare,
      status: "PENDING"
    });

    res.status(201).json({
      success: true,
      bookingId,
      fare: totalFare,
      status: booking.status
    });

  } catch (error) {
    console.error("Booking Error:", error);
    res.status(500).json({
      message: "Failed to create booking"
    });
  }
});

// confirm booking after successful payment
app.put("/booking/confirm/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { paymentId } = req.body;

    const booking = await Booking.findOneAndUpdate(
      { bookingId },
      {
        status: "CONFIRMED",
        paymentId
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found"
      });
    }

    res.json({
      success: true,
      message: "Booking confirmed successfully",
      booking
    });

  } catch (error) {
    console.error("Confirm Booking Error:", error);
    res.status(500).json({
      message: "Failed to confirm booking"
    });
  }
});




/*
app.get("/booking/qr/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Find booking in MongoDB
    const booking = await Booking.findOne({ bookingId });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // QR code content (you can customize what details to include)
    const qrData = {
      bookingId: booking.bookingId,
      source: booking.source,
      destination: booking.destination,
      persons: booking.persons,
      fare: booking.fare,
      status: booking.status,
    };

    // Generate QR code as Data URL (base64)
    const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData));

    // Return the QR code
    res.json({
      success: true,
      qrCode: qrCodeUrl,
      bookingId: booking.bookingId,
    });
  } catch (error) {
    console.error("QR Code Error:", error);
    res.status(500).json({ message: "Failed to generate QR code" });
  }
});
*/

/*

const { getStations } = require("./api");

app.get("/api", async (req, res) => {
  try {
    const stations = await getStations(); // call async function
    res.json(stations); // send JSON to client
  } catch (err) {
    res.status(500).send("Error calling API");
  }
});

*/

/*
app.get("/booking/qr/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;

    // 1️⃣ Validate booking
    const booking = await Booking.findOne({ bookingId });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found"
      });
    }

    // 2️⃣ Allow QR only for confirmed bookings
    if (booking.status !== "CONFIRMED") {
      return res.status(400).json({
        message: "QR can be generated only for confirmed bookings"
      });
    }

    // 3️⃣ Format actual creation time (HH:MM:SS)
    const createdAt = booking.createdAt;
    const hours = String(createdAt.getHours()).padStart(2, "0");
    const minutes = String(createdAt.getMinutes()).padStart(2, "0");
    const seconds = String(createdAt.getSeconds()).padStart(2, "0");

    const timeFormatted = `${hours}:${minutes}:${seconds}`;

    // 4️⃣ QR payload (keep minimal)
    const qrPayload = JSON.stringify({
      bookingId: booking.bookingId,
      source: booking.source,
      destination: booking.destination,
      persons: booking.persons,
      fare: booking.fare,
      time: timeFormatted
    });

    // 5️⃣ Generate QR as BUFFER
    const qrBuffer = await QRCode.toBuffer(qrPayload);

    // 6️⃣ HTTP CONTENT NEGOTIATION (CORRECT WAY)

    // Client explicitly wants IMAGE
    if (req.accepts("image/png")) {
      res.type("image/png");
      return res.send(qrBuffer);
    }

    // Client wants TEXT / JSON
    if (req.accepts("text/plain") || req.accepts("application/json")) {
      return res.json({
        bookingId: booking.bookingId,
        qrBase64: qrBuffer.toString("base64"),
        format: "base64"
      });
    }

    // 7️⃣ If client asks for unsupported format
    return res.status(406).json({
      message: "Not Acceptable. Supported formats: image/png, text/plain"
    });

  } catch (error) {
    console.error("QR Error:", error);
    res.status(500).json({
      message: "Failed to generate QR code"
    });
  }
}); */

app.get("/booking/qr/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;

    // 1️⃣ Validate booking
    const booking = await Booking.findOne({ bookingId }); // Ensure types match your Schema!
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // 2️⃣ Allow QR only for CONFIRMED bookings
    if (booking.status !== "CONFIRMED") {
      return res.status(400).json({ success: false, message: "QR only for confirmed bookings" });
    }

    // 3️⃣ CONTENT NEGOTIATION (Moved UP for Performance 🚀)
    // Check this BEFORE generating the heavy QR code
    const acceptsImage = req.accepts("image/png");
    const acceptsText = req.accepts("text/plain");

    if (!acceptsImage && !acceptsText) {
      return res.status(406).json({
        success: false,
        message: "Not Acceptable. Supported: image/png, text/plain"
      });
    }

    // 4️⃣ Format Time (Fixed for IST 🇮🇳)
    const timeFormatted = booking.createdAt.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    // 5️⃣ Minimal QR payload
    const qrPayload = JSON.stringify({
      bookingId: booking.bookingId,
      source: booking.source,
      destination: booking.destination,
      persons: booking.persons,
      fare: booking.fare,
      time: timeFormatted // Now correctly in IST
    });

    // 6️⃣ Generate QR
    const qrBuffer = await QRCode.toBuffer(qrPayload, { type: "png" });

    // 7️⃣ Response
    if (acceptsImage) {
      res.setHeader("Content-Type", "image/png");
      return res.send(qrBuffer);
    }

    if (acceptsText) {
      res.setHeader("Content-Type", "text/plain");
      return res.send(qrBuffer.toString("base64"));
    }

  } catch (error) {
    console.error("QR Generation Error:", error);
    return res.status(500).json({ success: false, message: "Failed to generate QR code" });
  }
});
