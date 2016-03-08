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
	var o = {
		tickets: [],
		createticket: function() {
			var ticket = {
				name: "",
				agegroup: "adult",
				foodRes: "none"
			};
			return ticket;
		}
	};
	o.addticket = function() {
		o.tickets.push(o.createticket());
	};
	o.purchase = function(ticket) {
		return $http.post('/createguest', ticket);
	};
	o.getAll = function() {
		return $http.get('/all/guests').then(function(data) {
			angular.copy(data.data, o.tickets);
			console.log("FOO");
		}, function(data) {
			console.log("ERROR");
		});
	};
	o.addticket();
	return o;
}]);



app.controller('ViewRegisteredPeopleCtrl', [
	'$scope',
	'tickets',
	function($scope, tickets) {
		$scope.tickets = tickets.tickets;
		console.log($scope.tickets);
	}]);


app.controller('BuyTicketsCtrl', [
	'$scope',
	'$q',
	'$state',
	'tickets',
	function($scope, $q, $state, tickets) {
		$scope.tickets = tickets.tickets;
		$scope.addTicket = tickets.addticket;
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
