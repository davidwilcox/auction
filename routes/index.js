var express = require('express');
var router = express.Router();


var simpledb = require('simpledb');
var sdb      = new simpledb.SimpleDB(
    {keyid:'AKIAIZELJIBWQ3ETHZ4A',secret:'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'})


function guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}


/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});

router.post('/createdomain/:domain', function(req, res, next) {
    sdb.createDomain( req.params.domain, function( error ) {
        console.log(error);
        res.json({Error:error});
    });
});

router.post('/deletedomain/:domain', function(req, res, next) {
    sdb.deleteDomain( req.params.domain, function(err, result, meta) {
        res.json({Error:err});
    });
});

router.post('/createguest', function(req, res, next) {
    guest = req.body;
    if ( !('firstname' in guest) ) {
        res.status(300).send({Message:"'firstname' attribute note defined."});
        return;
    } else if ( !('lastname' in guest) ) {
        res.status(300).send({Message:"'lastname' attribute note defined."});
        return;
    } else if ( !('email' in guest) ) {
        res.status(300).send({Message:"'email' attribute note defined."});
        return;
    } else if ( !('food' in guest) ) {
        res.status(300).send({Message:"'food' attribute note defined."});
        return;
    } else if ( !('agegroup' in guest) ) {
        res.status(300).send({Message:"'agegroup' attribute note defined."});
        return;
    } else if ( guest.agegroup != 'adult' && guest.agegroup != 'teen' && guest.agegroup != 'child' ) {
        res.status(300).send({Message:"'agegroup' should be set to 'adult', 'teen' or 'child'"});
        return;
    } else if ( guest.food != 'meat' && guest.food != 'vegan' && guest.food != 'glutenfree' ) {
        res.status(300).send({Message:"'food' should be set to 'vegan', 'meat' or 'glutenfree'"});
        return;
    }
    guest.guestid = guid();
    sdb.putItem('guests', guest.guestid, guest, function( error ) {
        console.log(error);
        res.status(200).json(guest);
    });
});

router.get('/guest/:guestid', function(req, res, next) {
    console.log(req.params.guestid);
    sdb.getItem('guests', req.params.guestid, function( error, getItemResult, meta ) {
        console.log(getItemResult);
        res.json(getItemResult);
    });
});

router.get("/allguests", function(req, res, next) {
    sdb.select('select * from guests', function(error, selectResult, meta) {
        console.log(selectResult);
        res.json(selectResult);
    });
});

module.exports = router;
