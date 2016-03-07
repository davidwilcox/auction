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
				controller: 'ViewRegisteredPeopleCtrl'
			})
			.state('viewdonateditems', {
				url: '/viewdonateditems',
				templateUrl: '/templates/viewdonateditems.html',
				controller: 'ViewDonatedItemsCtrl'
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


app.controller('ViewRegisteredPeopleCtrl', [
	'$scope',
	function($scope) {
		
	}]);


app.controller("ViewDonatedItemsCtrl", [
	'$scope',
	function($scope) {
		
	}]);

app.factory('tickets', [function() {
	var o = {
		tickets: [],
		createticket: function() {
			var ticket = {
				name: "",
				age: "Adult",
				foodRes: "none"
			};
			return ticket;
		}
	};
	o.addticket = function() {
		o.tickets.push(o.createticket());
	};
	o.addticket();
	return o;
}]);



app.controller('BuyTicketsCtrl', [
    '$scope',
	'tickets',
    function($scope, tickets){

		$scope.tickets = tickets.tickets;
		$scope.addTicket = tickets.addticket;
	
    }]);
