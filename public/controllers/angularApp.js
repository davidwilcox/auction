var app = angular.module('auction', ['ui.router'])

app.config([
    '$stateProvider',
    '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {

        $stateProvider
            .state('home', {
                url: '/home',
                templateUrl: '/templates/home.html',
                controller: 'MainCtrl'
            })
            .state('register', {
                url: '/register',
                templateUrl: '/templates/adduser.html',
                controller: 'AddUserCtrl'
            })

        $urlRouterProvider.otherwise('home');
    }]);


app.controller('MainCtrl', [
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


app.controller('AddUserCtrl', [
    '$scope',
    function($scope){

    }]);
