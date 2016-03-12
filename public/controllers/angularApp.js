var app = angular.module('auction', ['ui.router'])

app.config([
	'$stateProvider',
	'$urlRouterProvider',
	function($stateProvider, $urlRouterProvider) {

		$stateProvider
			.state('buytickets', {
				url: '/buytickets',
				templateUrl: '/templates/buytickets.html',
				controller: 'BuyTicketsCtrl'
			})
			.state('donateitem', {
				url: '/donateitem',
				templateUrl: '/templates/donateitem.html',
				controller: 'DonateItemCtrl'
			})
			.state('home', {
				url: '/home',
				templateUrl: '/templates/home.html',
				controller: 'HomeCtrl'
			})
			.state('viewregisteredpeople', {
				url: '/viewregisteredpeople',
				templateUrl: '/templates/viewregisteredpeople.html',
				controller: 'ViewRegisteredPeopleCtrl',
				resolve: {
					registeredPromise: ['tickets', function(tickets) {
						return tickets.getAll();
					}]
				}
			})
			.state('viewdonateditems', {
				url: '/viewdonateditems',
				templateUrl: '/templates/viewdonateditems.html',
				controller: 'ViewDonatedItemsCtrl'
			})
			.state('buyticketsconfirmation', {
				url: '/buyticketsconfirmation',
				templateUrl: '/templates/buyticketsconfirmation.html',
				controller: 'BuyticketsconfirmationCtrl'
			})
			.state('register', {
				url: '/register',
				templateUrl: '/templates/adduser.html',
				controller: 'AddUserCtrl'
			})

		$urlRouterProvider.otherwise('home');
	}]);


app.controller('DonateItemCtrl', [
	'$scope',
	function($scope) {
		$scope.itemname = "";
		$scope.fmv = 0;
		$scope.quantity = 1;
		$scope.description = "";
		$scope.restrictions = "";

		$scope.donateitem = function() {
			
		};
	}]);


app.controller('HomeCtrl', [
	'$scope',
	'$state',
	function($scope, $state) {
	}]);


app.controller("BuyticketsconfirmationCtrl", [
	'$scope',
	function($scope) {
		
	}]);

app.controller("ViewDonatedItemsCtrl", [
	'$scope',
	function($scope) {
		
	}]);

app.factory('tickets', ['$http', '$q', function($http, $q) {
	
	return {
		purchase: function(ticket) {
			return $http.post('/createguest', ticket);
		},

		getAll: function() {
			rtval = $http.get('/all/guests').then(function(data) {
				console.log(data.data);
				return data.data;
			}, function(data) {
				console.log("ERROR");
			});
			console.log(rtval);
			return rtval;
		}
	};

}]);



app.controller('ViewRegisteredPeopleCtrl', [
	'$scope',
	'tickets',
	function($scope, tickets) {
		tickets.getAll().then(
			function(result) {
				$scope.tickets = result;
			});
		console.log($scope.tickets);
	}]);


app.controller('BuyTicketsCtrl', [
	'$scope',
	'$q',
	'$state',
	'tickets',
	function($scope, $q, $state, tickets) {
		$scope.tickets = [];
		$scope.numAdultTickets = 1;
		$scope.numTeenTickets = 0;
		$scope.numChildTickets = 0;

		var createTicket = function() {
			var ticket = {
				name: "",
				agegroup: "adult",
				foodRes: "none"
			};
			return ticket;
		}

		var initializeTickets = function() {
			$scope.tickets = [];
			$scope.tickets[0] = createTicket();
		}

		initializeTickets();
		
		
		$scope.addTicket = function() {
			$scope.tickets.push(createTicket());
			$scope.computeOrderDetails();
		};

		$scope.removeTicket = function(index) {
			$scope.tickets.splice(index, 1);
			$scope.computeOrderDetails();
		};

		$scope.computeOrderDetails = function() {
			var adultTickets = 0;
			var teenTickets = 0;
			var childTickets = 0;
			$scope.tickets.forEach(function(ticket) {
				switch (ticket.agegroup) {
					case "adult":
						adultTickets++;
						break;
					case "teen":
						teenTickets++;
						break;
					case "child":
						childTickets++;
						break;
				}
			});

			$scope.numAdultTickets = adultTickets;
			$scope.numTeenTickets = teenTickets;
			$scope.numChildTickets = childTickets;
		};

		$scope.purchase = function() {
			var promises = [];
			$scope.tickets.forEach(function(ticket) {
				promises.push(tickets.purchase(ticket));
			});
			$q.all(promises).then(function(data) {
				// route to confirmation page.
				$state.go('buyticketsconfirmation');
			}, function(data) {
				// route to error page.
				console.log("ERROR");
				console.log(data);
			});
		};
	}]);
