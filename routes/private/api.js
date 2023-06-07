const { isEmpty } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
const { getSessionToken } = require("../../utils/session");
const getUser = async function (req) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return res.status(301).redirect("/");
  }
  console.log("hi", sessionToken);
  const user = await db
    .select("*")
    .from("sessions")
    .where("token", sessionToken)
    .innerJoin("users", "sessions.userid", "users.id")
    .innerJoin("roles", "users.roleid", "roles.id")
    .first();

  console.log("user =>", user);
  user.isNormal = user.roleid === roles.user;
  user.isAdmin = user.roleid === roles.admin;
  user.isSenior = user.roleid === roles.senior;
  console.log("user =>", user);
  return user;
};
// reset password for user
module.exports = function (app) {
  app.put("/api/v1/password/reset", async function (req, res) {
    try {
      const user = await getUser(req);
      if (!user) {
        return res.status(401).send("Invalid session token");
      }

      const currentPassword = req.body.currentPassword;
      console.log("currentPassword", currentPassword);
      const newPassword = req.body.newPassword;

      // Perform password validation and checks here...

      // Check if the current password matches the user's actual password
      if (currentPassword !== user.password) {
        return res.status(401).send("Current password is incorrect");
      }

      // Update the user's password to the new password
      user.password = newPassword;

      // Perform any necessary password hashing or encryption here...

      // Update the user's password in the database
      await db("users").where("id", user.userid).update({ password: newPassword });

      return res.status(200).send("Password updated successfully");
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not update password");
    }
  });
  //---------------------------------------------------------------------------
  app.post("/api/v1/payment/ticket", async function (req, res) {
    const {
      creditCardNumber,
      holderName,
      payedAmount,
      origin,
      destination,
      tripDate,
    } = req.body;

    try {
      // Retrieve the user object using the getUser method
      const user = await getUser(req); // Assuming getUser is an asynchronous function that returns the user object

      // Insert the ticket data into the tickets table
      const ticket = await db("tickets").insert({
        origin,
        destination,
        userid: user.userid, // Use the retrieved user ID
        subid: null, // Set the subscription ID if applicable
        tripdate: tripDate,
      }).returning('*');

      // Return the created ticket data in the response
      res.status(201).json({ ticket });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Something went wrong" });
    }
  });
  //------------------------------------------------------------------------//
  //msh sh8ala
  app.post("/api/v1/payment/subscription", async function (req, res) {
    const { creditCardNumber, holderName, payedAmount, subType, zoneId } = req.body;

    // Validate request parameters
    if (!creditCardNumber || !holderName || !payedAmount || !subType || !zoneId) {
      return res.status(400).send("All parameters are required");
    }

    try {
      // Process payment using payment gateway API or other payment service
      const paymentResult = await processPayment(creditCardNumber, holderName, payedAmount);

      // Save subscription details to database
      const userId = req.user.id;
      await db("subsription").insert({
        userid: userId,
        credit_card_number: creditCardNumber,
        holder_name: holderName,
        payed_amount: payedAmount,
        subscription_type: subType,
        zone_id: zoneId
      });

      // Return success response
      return res.status(200).json({ message: "Subscription payment successful" });
    } catch (e) {
      console.error(e.message);
      return res.status(500).send("Server error");
    }
  });

  //---------------------------------------------------------------//
  app.get("/api/v1/subscription", async function (req, res) {
    try {
      const user = await getUser(req);
      const userid = user.userid;
      // Retrieve zones data from database
      const subscription = await db.select("*").from("subsription").where(subsription.userid === userid);

      // Return zones data as JSON response
      return res.status(200).json(subscription);
    } catch (e) {
      console.error(e.message);
      return res.status(500).send("Server error");
    }
  });
  //------------------------------------------------------------------
  app.get("/api/v1/zones", async function (req, res) {
    try {
      // Retrieve zones data from database
      const zones = await db.select("*").from("zones");

      // Return zones data as JSON response
      return res.status(200).json(zones);
    } catch (e) {
      console.error(e.message);
      return res.status(500).send("Server error");
    }
  });

  // ZONES

  // Updating Zones Price by Admin

  app.put('/api/v1/zones/:zoneId', async (req, res) => {

    try {
      const { zoneId } = req.params//.zoneId;
      const { price } = req.body//.price
      const UpdatingZone = await db('zones')
        .where("id", zoneId) //the
        .update({ price: price })
      //.then(function(){return res.status(200).json({UpdatingZone});})
      console.log(UpdatingZone);
      return res.status(201).json(UpdatingZone);

    }
    catch (error) {
      console.log(error.message);
      return res.status(400).send("Could not get the updated Zones");
    }


  });

  // REQUESTS

  // Accept or Reject Funds not sure



  app.put('/api/v1/requests/refunds/:requestId', async (req, res) => {
    try {
      const { requestId } = req.params;
      const { status } = req.body;
  
      const updatingStatus = await db('refund_requests')
        .where({ id: requestId })
        .update({ status: status }); // Include the status value in the update query
  
        console.log(updatingStatus);
        return res.status(200).json(updatingStatus); // Changed the status code
    } catch (error) {
      console.log(error.message);
      return res.status(400).send("Could not update the refund status");
    }
  });
  

  //Accept or Reject Senior not sure
  app.put('/api/v1/requests/senior/:requestId', async (req, res) => {
    try {
      const { requestId } = req.params;
      const { status } = req.body;
  
      const updatingStatus = await db('senior_requests')
        .where({ id: requestId })
        .update({ status: status });
  
      if (status === 'accepted') {
        await db('users')
          .where('id', '=', function() {
            this.select('userid')
              .from('senior_requests')
              .where('id', requestId);
          })
          .update({ roleid: 3 });
      }
  
      console.log(updatingStatus);
      return res.status(200).json(updatingStatus);
    } catch (error) {
      console.log(error.message);
      return res.status(400).send("Could not update the senior status");
    }
  });
  
  

  
  // get subscription by id of the user 
  app.get("/api/v1/subscription", async function (req, res) {
    try {
      const user = await getUser(req);
      const userid=user.userid ;
      // Retrieve zones data from database
      const subscription = await db.select("*").from("subscription").where(subscription.userid===userid);

      // Return zones data as JSON response
      return res.status(200).json(subscription);
    } catch (e) {
      console.error(e.message);
      return res.status(500).send("Server error");
    }
  });
  //get all tickets 
  app.get("/api/v1/tickets", async function (req, res) {
    try {
      // Retrieve zones data from database
      const tickets = await db.select("*").from("tickets");

      // Return zones data as JSON response
      return res.status(200).json(tickets);
    } catch (e) {
      console.error(e.message);
      return res.status(500).send("Server error");
    }
  });

// post request to request a senior degree
app.post('/api/v1/senior/request', async (req, res) => {
  try {
    const { nationalid } = req.body;
    //const { status } = req.body;
    const user = await getUser(req);
    const userid=user.userid ;

    // Check if the station name is provided
    if (!nationalid) {
      return res.status(400).send('national is is required');
    }

    // Create a new station object
    const newrequest = {
      nationalid,
      status: "pending",
      userid,
     
    };

    // Insert the new station into the "stations" table
    await db("senior_requests").insert(newrequest).returning("*");

    return res.status(201).send('request added successfully');
  }
  catch (error) {
    console.log(error.message);
    return res.status(400).send('Could not add the new request');
  }
});
// post request to request a refund
app.post('/api/v1/refund/request', async (req, res) => {
  try {
    const { refundamount } = req.body;
    const { ticketid } = req.body;
    const user = await getUser(req);
    const userid = user.userid;

    // Check if the refund amount is provided
    if (!refundamount) {
      return res.status(400).send('refundamount is required');
    }

    // Create a new request object with the initial status as "pending"
    const newrequest = {
      status: "pending",
      userid,
      refundamount,
      ticketid,
    };

    // Insert the new request into the "refund_requests" table
    await db("refund_requests").insert(newrequest).returning("*");

    return res.status(201).send('request added successfully');
  } catch (error) {
    console.log(error.message);
    return res.status(400).send('Could not add the new request');
  }
});


  // STATIONS

  // Creating Stations by Admin

  app.post('/api/v1/station', async (req, res) => {
    try {
      const { stationname, stationtype, stationstatus } = req.body;

      // Check if the station name is provided
      if (!stationname) {
        return res.status(400).send('Station name is required');
      }

      // Create a new station object
      const newstation = {
        stationname,
        stationtype,
        stationposition: null,
        stationstatus,
      };

      // Insert the new station into the "stations" table
      await db("stations").insert(newstation).returning("*");

      return res.status(201).send('Station added successfully');
    }
    catch (error) {
      console.log(error.message);
      return res.status(400).send('Could not add the new station');
    }
  });

  // Updating Stations by Admin

  app.put('/api/v1/stations/:stationid', async (req, res) => {
    
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    try {
      const { stationid } = req.params;
      const { stationname } = req.body
      const UpdatingStation = await db('stations')
        .where("id", stationid)
        .update({ stationname: stationname })
        .returning('*');
      console.log(UpdatingStation);
      return res.status(201).json(UpdatingStation);
    }
    catch (error) {
      console.log(error.message);
      return res.status(400).send("Could not get the updated Stations");
    }


  })
  // Create Route
  app.post('/api/v1/route', async (req, res) => {
    const { routename, fromstationid, tostationid } = req.body;

    if (!fromstationid || !tostationid || !routename) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    console.log(tostationid);

    try {
      const newRoute = {
        routename,
        fromstationid,
        tostationid,
      };

      const { data, error } = await db('routes').insert([newRoute], ['routename', 'fromstationid', 'tostationid']);
      if (error) {
        throw error;
      }

      res.status(200).json({ message: 'Route created successfully', data });

    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Error creating route', details: error });
    }
  });

  app.put('/api/v1/route/:id', async (req, res) => {
    const { id } = req.params;
    const { routename, fromstationid, tostationid } = req.body;

    if (!routename || !fromstationid || !tostationid) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      const { rowCount } = await db('routes').where({ id }).update({ routename, fromstationid, tostationid });

      if (rowCount === 0) {
        return res.status(404).json({ error: 'Route not found' });
      }

      return res.status(200).json({ message: 'Route updated successfully' });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Error updating route', details: error.message });
    }
  });


  // Delete Route
  app.delete("/api/v1/route/:routeId", async function (req, res) {
    const { routeId } = req.params;
  
    try {
      // Get the route being deleted
      const route = await db("routes").where({ id: routeId }).first();
      if (!route) {
        return res.status(404).json({ error: "Route not found" });
      }
  
      const { fromstationid, tostationid } = route;
  
      // Get the from station
      const fromStation = await db("stations").where({ id: fromstationid }).first();
      if (!fromStation) {
        return res.status(404).json({ error: "From station not found" });
      }
  
      // Get the to station
      const toStation = await db("stations").where({ id: tostationid }).first();
      if (!toStation) {
        return res.status(404).json({ error: "To station not found" });
      }
  
      // Update station positions
      if (fromStation.stationposition === "start") {
        if(toStation.stationposition ==="end"){
        // Update from station position to "end"
        await db("stations").where({ id: fromstationid }).update({ stationposition: "end" });
  
        // Update to station position to "start"
        await db("stations").where({ id: tostationid }).update({ stationposition: "start" });
        }
        else if (toStation.stationposition ==="middle"){
          await db("stations").where({ id: fromstationid }).update({ stationposition: "middle" });
  
          // Update to station position to "start"
          await db("stations").where({ id: tostationid }).update({ stationposition: "start" });
        } 
      }
  
      // Delete the route
      await db("routes").where({ id: routeId }).del();
  
      res.status(204).send();
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Something went wrong" });
    }
  });
  
  ////////////////////////////////////////////////////////////////////////////////////////////////


  // Get all routes 
  app.get('/api/v1/routes', async (req, res) => {
    try {
      const routes = await db.select('*').from('routes');
      return res.status(200).json(routes);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Error retrieving routes', details: error.message });
    }
  });



// Delete Station
// Delete Station
app.delete("/api/v1/stations/:stationid", async function (req, res) {
  const { stationid } = req.params;

  try {
    // Get the station being deleted
    const station = await db("stations").where({ id: stationid }).first();
    if (!station) {
      return res.status(404).json({ error: "Station not found" });
    }

    const { stationtype, stationposition } = station;

    // Delete the station itself
    await db("stations").where({ id: stationid }).del();

    if (stationtype === "normal") {
      if (stationposition === "start") {
        // Find the next station in the route
        const nextStation = await db("stations")
          .where("id", ">", stationid)
          .orderBy("id")
          .first();

        if (nextStation) {
          // Update the next station's position to "start"
          await db("stations")
            .where({ id: nextStation.id })
            .update({ stationposition: "start" });
        }
      } else if (stationposition === "end") {
        // Find the previous station in the route
        const prevStation = await db("stations")
          .where("id", "<", stationid)
          .orderBy("id", "desc")
          .first();

        if (prevStation) {
          // Update the previous station's position to "end"
          await db("stations")
            .where({ id: prevStation.id })
            .update({ stationposition: "end" });
        }
      } else if (stationposition === "middle") {
        // Find the previous and next stations in the route
        const [prevStation, nextStation] = await db("routes")
          .leftJoin("stations as prev", "routes.fromstationid", "prev.id")
          .leftJoin("stations as next", "routes.tostationid", "next.id")
          .where({ "routes.fromstationid": stationid })
          .orWhere({ "routes.tostationid": stationid })
          .select("prev.*", "next.*");

        if (prevStation && nextStation) {
          // Update the routes
          await db("routes")
            .where({ fromstationid: stationid })
            .orWhere({ tostationid: stationid })
            .update({
              fromstationid: prevStation.id,
              tostationid: nextStation.id,
            });

          // Delete the old stationroutes
          await db("stationroutes")
            .where({ stationid })
            .del();

          // Create new stationroutes for the updated routes
          const newStationRoutes = [
            { stationid: prevStation.id, routeid: prevStation.routeid },
            { stationid: nextStation.id, routeid: nextStation.routeid },
          ];
          await db("stationroutes")
            .insert(newStationRoutes);
        }
      }
    }
    //////////////
    else if(stationtype === "transfer"){
      const route = await db("routes").where({ tostationid: stationid }).first();
      console.log(route);
      const stationtobe =route.fromstationid ;
      await db("routes").where({ fromstationid: stationid }).update({ fromstationid: stationtobe });

      // Delete the station itself
      await db("stations").where({ id: stationid }).del();
      

    }

    res.status(204).send();
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get('/api/v1/tickets/price/:originId/:destinationId', async (req, res) => {
  const { originId, destinationId } = req.params;

  try {
    // Function to get the number of stations between origin and destination
    const getNumberOfStations = async (currentStationId, destinationId, visited = new Set()) => {
      visited.add(currentStationId); // Mark the current station as visited

      if (currentStationId === destinationId) {
        // If the current station is the destination, return 0
        return 0;
      }

      // Get the routes that depart from the current station
      const routes = await db
        .select('*')
        .from('routes')
        .where('fromstationid', currentStationId);

      for (const route of routes) {
        const nextStationId = route.tostationid;

        if (!visited.has(nextStationId)) {
          const stationsCount = await getNumberOfStations(nextStationId, destinationId, visited);

          if (stationsCount >= 0) {
            // If a route is found from the next station to the destination, return the total number of stations
            return stationsCount + 1;
          }
        }
      }

      // If no route is found between the current station and the destination, return -1
      visited.delete(currentStationId);
      return -1;
    };

    // Get the number of stations between origin and destination
    const numberOfStations = await getNumberOfStations(Number(originId), Number(destinationId));

    if (numberOfStations === -1) {
      return res.status(404).json({ error: 'No route found between the origin and destination' });
    }

    // Determine the zone type
    const zoneType = numberOfStations <= 9 ? 'A' : numberOfStations <= 16 ? 'B' : 'C';

    // Get the ticket price from the zones table
    const price = await db
      .select('price')
      .from('zones')
      .where({ zonetype: zoneType })
      .first();

    if (!price) {
      return res.status(404).json({ error: 'Ticket price not found' });
    }

    res.json({ numberOfStations, ticketPrice: price.price });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// get all request refund

app.get('/api/v1/requests/refunds', async (req, res) => {
  try {
    const refunds = await db.select('*').from('refund_requests');
    return res.status(200).json(refunds);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Error retrieving requests', details: error.message });
  }
});
// get all request senior

app.get('/api/v1/requests/senior', async (req, res) => {
  try {
    const senior = await db.select('*').from('senior_requests');
    return res.status(200).json(senior);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Error retrieving requests', details: error.message });
  }
});


};
