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
			.state('register', {
				url: '/register',
				templateUrl: '/templates/adduser.html',
				controller: 'AddUserCtrl'
			})

		$urlRouterProvider.otherwise('buytickets');
	}]);


app.controller('BuyTicketsCtrl', [
    '$scope',
    function($scope){
		
		$scope.tickets = [];
		
		$scope.ticket = {
			name: "",
			age: "Adult",
			foodRes: "none"
		};

		$scope.tickets.push($scope.ticket);

		$scope.addTicket = function() {
			var ticket = {
				name: "",
				age: "Adult",
				foodRes: "none"
			};

			$scope.tickets.push(ticket);
		}
	
    }]);
