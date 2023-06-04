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
  //------------------------------------------------------------------------//
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
      const { requestId } = req.params
      const { requeststatus } = req.body
      const UpdatingStatus = await db('refund_requests')
        .where("id", requestId) //the
        .update({ status: requeststatus })
      console.log(UpdatingStatus);
      return res.status(201).json(UpdatingStatus);

    }
    catch (error) {
      console.log(error.message);
      return res.status(400).send("Could not get the updated Zones");
    }


  })

  //Accept or Reject Senior not sure


  app.put('/api/v1/requests/senior/:requestId', async (req, res) => {

    try {
      const { requestId } = req.params
      const { seniorstatus } = req.body
      const UpdatingStatus = await db('senior_requests')
        .where("id", requestId) //the
        .update({ status: seniorstatus })
      console.log(UpdatingStatus);
      return res.status(201).json(UpdatingStatus);

    }
    catch (error) {
      console.log(error.message);
      return res.status(400).send("Could not get the updated Zones");
    }


  })


  // STATIONS

  // Creating Stations by Admin

  app.post('/api/v1/station', async (req, res) => {
    try {
      const { stationname } = req.body;

      // Check if the station name is provided
      if (!stationname) {
        return res.status(400).send('Station name is required');
      }

      // Create a new station object
      const newstation = {
        stationname,
        stationtype: null, // Set the station type to null or provide a value if applicable
        stationposition: null, // Set the station position to null or provide a value if applicable
        stationstatus: null, // Set the station status to null or provide a value if applicable
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
  app.delete('/api/v1/route/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const deleteCount = await db('routes').where({ id }).del();

      if (deleteCount === 0) {
        return res.status(404).json({ error: 'Route not found' });
      }

      return res.status(204).end();
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Error deleting route', details: error.message });
    }
  });


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





};
