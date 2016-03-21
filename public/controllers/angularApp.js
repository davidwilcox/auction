var app = angular.module('auction', ['ngMessages', 'ui.router'])

app.config([
	'$stateProvider',
	'$urlRouterProvider',
	function($stateProvider, $urlRouterProvider) {

		$stateProvider
			.state('buytickets', {
				url: '/buytickets',
				templateUrl: '/templates/buytickets.html',
				controller: 'BuyTicketsCtrl'/*,
				onEnter: [ '$state', 'auth', function($state, auth) {
					if ( !auth.isLoggedIn() ) {
						$window.sessionStorage['targetPage'] =
						$state.go('login');
					}
				}]*/
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
				controller: 'ViewRegisteredPeopleCtrl'/*,
				resolve: {
					registeredPromise: ['tickets', function(tickets) {
						return tickets.getAll();
					}]
				}*/
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
			.state('login', {
				url: '/login',
				templateUrl: '/templates/login.html',
				controller: 'LoginCtrl',
				onEnter: [ '$state', 'auth', function($state, auth) {
					if ( auth.isLoggedIn() ) {
						$state.go('home');
					}
				}]
			})
			.state('register', {
				url: '/register',
				templateUrl: '/templates/register.html',
				controller: 'RegisterCtrl',
				onEnter: [ '$state', 'auth', function($state, auth) {
					if ( auth.isLoggedIn() ) {
						$state.go('home');
					}
				}]
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

app.factory('auth', ['$http', '$window', '$q', function($http, $window, $q) {
	var o = {
	};
	o.saveToken = function(token) {
		$window.localStorage['auction-token'] = token;
	};
	o.getToken = function(token) {
		return $window.localStorage['auction-token'];
	};
	o.isLoggedIn = function() {
		var token = o.getToken();

		if ( token ) {
			var payload = JSON.parse($window.atob(token.split('.')[1]));
			return payload.exp > Date.now() / 1000;
		} else {
			return false;
		}
	};
	o.register = function(user) {
		if ( user.confirmPassword == user.password ) {
			delete user['confirmPassword'];
			return $http.post('/register', user).success(function(data) {
				o.saveToken(data.token);
			});
		}
		$q.reject("password and confirm password did not match.");
		
	};
	o.logIn = function(user) {
		return $http.post('/login', user).success(function(data) {
			o.saveToken(data.token);
		});
	};
	o.logOut = function(user) {
		$window.localStorage.removeItem('auction-token')
	};
	return o;
}]);

app.factory('tickets', ['$http', '$q', function($http, $q) {
	
	return {
		purchase: function(ticket) {
			return $http.post('/createguest', ticket);
		},

		getAll: function() {
			rtval = $http.get('/allguests').then(function(data) {
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



var compareTo = function() {
    return {
		require: "ngModel",
		scope: {
			otherModelValue: "=compareTo"
		},
		link: function(scope, element, attributes, ngModel) {

			ngModel.$validators.compareTo = function(modelValue) {
				return modelValue == scope.otherModelValue;
			};

			scope.$watch("otherModelValue", function() {
				ngModel.$validate();
			});
		}
    };
};

app.directive("compareTo", compareTo);



app.directive("fileread", [function () {
	return {
		scope: {
			fileread: "="
		},
		link: function (scope, element, attributes) {
			element.bind("change", function (changeEvent) {
				var reader = new FileReader();
				reader.onload = function (loadEvent) {
					scope.$apply(function () {
						scope.fileread = loadEvent.target.result;
					});
				}
				reader.readAsDataURL(changeEvent.target.files[0]);
			});
		}
	}
}]);

app.controller('LoginCtrl', [
	'$scope',
	'$state',
	'auth',
	function($scope, $state, auth) {
		$scope.user = {};
		$scope.logIn = function() {
			auth.logIn($scope.user).error(function(error) {
				console.log($scope.user);
				$scope.error = error;
			}).then(function() {
				$state.go('home');
			});
		};
	}]);

app.controller('RegisterCtrl', [
	'$scope',
	'$state',
	'$http',
	'auth',
	function($scope, $state, $http, auth) {
		$scope.user = {};

		$scope.register = function() {
			console.log("ASD\n");
			console.log($scope.user);
			picture = $scope.user.picture;
			delete $scope.user.picture;
			auth.register($scope.user).error(function(error) {
				$scope.error = error;
			}).success(function(data) {
				console.log(data);
				console.log("here");
				if ( picture ) {
					console.log("there");
					payload = {
						"photo": picture
					};
					$http.post('/uploadphoto', payload).error(
						function(error) {
							$scope.error = error;
						}).then(function() {
							$state.go('home');
						});
				} else {
					$state.go('home');
				}
			});
		};
	}]);


app.controller('NavCtrl', [
	'$scope', 'auth', function($scope, auth) {
		$scope.isLoggedIn = auth.isLoggedIn;
		$scope.currentUser = auth.currentUser;
		$scope.logOut = auth.logOut;
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
