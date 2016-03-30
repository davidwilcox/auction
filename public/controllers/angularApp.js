var app = angular.module('auction', ['ngMessages', 'ui.router', 'pascalprecht.translate', 'ngSanitize'])



app.config(['$translateProvider', function ($translateProvider) {
	$translateProvider.translations('en', {
		// item translations.
		KIDSFREE: "Kids 14 and under are FREE, and they DON'T count as a spot (you'll have more attendees than buyers).",
		KIDSFREECOUNT: "Kids 14 and under are FREE, and they DO count as a spot.",
		EVERYBODYCOUNTS: "Everybody (including kids) counts as a spot and needs to pay full price.",
		THREEPRICES: "There's an Adult Price, a Kid's Price, and a Maximum Family Price.",
		OVER14: "Only people 14 and over please -- no younger kids.",
		OVER21: "Only adults 21 and over.",
		KIDSPARTY: "This is a kid's party! Kids count as a spot, but adults don't.",
		ADULT_TICKET: "Adult",
		HIGHSCHOOL_TICKET: "High School",
		JUNIORHIGH_TICKET: "Junior High School",
		CHILD_TICKET: "Child",
		NONE_FOOD: "No food restrictions",
		VEGAN_FOOD: "Vegan",
		GLUTENFREE_FOOD: "Gluten-free"
	});
	$translateProvider.preferredLanguage('en');
	$translateProvider.useSanitizeValueStrategy('sanitize');
}]);

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
			.state('myauction', {
				url: '/myauction',
				templateUrl: '/templates/myauction.html',
				controller: 'MyAuctionCtrl',
				onEnter: [ '$state', 'auth', function($state, auth) {
					if ( !auth.isLoggedIn() ) {
						$state.go('home');
					}
				}]
			})

		$urlRouterProvider.otherwise('home');
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
	'$http',
	function($scope, $http) {
		$http.get("/all/items").success(function(data) {
			console.log(data);
			$scope.items = data;
		}).error(function(error) {
			$scope.error = error;
		});
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
			return $http.post('/register', user).success(function(data) {
				o.saveToken(data.token);
				o.saveUser(data.user);
			}).error(function(data) {
				delete user['confirmPassword'];
			});
		}
		$q.reject("password and confirm password did not match.");
	};
	o.logIn = function(user) {
		return $http.post('/login', user).success(function(data) {
			o.saveToken(data.token);
			o.saveUser(data.user);
		});
	};
	o.logOut = function(user) {
		$window.localStorage.removeItem('auction-token');
	};
	o.saveUser = function(user) {
		$window.localStorage['auction-user'] = user;
	};
	o.currentUserEmail = function(){
		if(o.isLoggedIn()) {
			var token = o.getToken();
			var payload = JSON.parse($window.atob(token.split('.')[1]));
			return payload.user.email;
		}
	};
	o.currentUser = function() {
		if(o.isLoggedIn()) {
			var token = o.getToken();
			var payload = JSON.parse($window.atob(token.split('.')[1]));
			return payload.user;
		}
	};
	return o;
}]);

app.controller('DonateItemCtrl', [
	'$scope',
	'$state',
	'$http',
	'$window',
	'auth',
	function($scope, $state, $http, $window, auth) {

		$scope.policies = ["KIDSFREE","KIDSFREECOUNT","EVERYBODYCOUNTS","THREEPRICES","OVER14","OVER21","KIDSPARTY"];
		$scope.item = {
			category: "event",
			name: '',
			policy: "KIDSFREE"
		};
		$scope.itemMaxLength = 30;
		$scope.descriptionMaxLength = 200;
		user = auth.currentUser();
		if ( user ) {
			$scope.donor = user;
		} else if ( $window.localStorage['donor-info'] ) {
			$scope.donor = $window.localStorage['donor-info'];
		}

		$scope.donateitem = function() {
			// persist user info.
			$window.localStorage['donor-info'] = $scope.donor;
			$scope.item.donor = $scope.donor;

			$http.post('/submititem', $scope.item,{headers: {
				Authorization: "Bearer " + auth.getToken() } }).success(function(data) {
					console.log('going home');
					$state.go('home');
				}).error(function(error) {
					console.log('error');
					$scope.error = error;
				});
		};
	}]);


app.factory('tickets', ['$http', '$q', function($http, $q) {

	return {
		purchase: function(ticket) {
			return $http.post('/createguest', ticket);
		},

		getAll: function() {
			rtval = $http.get('/allguests').then(function(data) {
				return data.data;
			}, function(data) {
				console.log("ERROR");
			});
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

		$scope.fileNameChanged = function(ele) {
			$scope.user.filename = ele.files[0].name;
		};

		$scope.register = function() {
			picture = $scope.user.picture;
			filename = $scope.user.filename;
			delete $scope.user.picture;
			delete $scope.user.filename;

			var register = function() {
				auth.register($scope.user).error(function(error) {
					console.log($scope.user);
					$scope.error = error;
				}).success(function(data) {
					$state.go('home');
				});
			};

			payload = {
				"photo": picture,
				"filename": filename
			};
			if ( picture ) {
				$http.post('/uploadphoto', payload).error(
					function(error) {
						$scope.error = error;
					}).then(function(data) {
						$scope.user.photoid = data.data.photoid
						register();
					});
			} else {
				register();
			}
		};
	}]);


app.controller('NavCtrl', [
	'$scope', 'auth', function($scope, auth) {
		$scope.isLoggedIn = auth.isLoggedIn;
		$scope.currentUser = auth.currentUserEmail;
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
	}]);



app.directive('datetimez', function() {
	return {
		restrict: 'A',
		require : 'ngModel',
		link: function(scope, element, attrs, ngModelCtrl) {
			element.datetimepicker({
			  dateFormat:'dd/MM/yyyy hh:mm:ss'
		  }).on('changeDate', function(e) {
			  ngModelCtrl.$setViewValue(e.date);
			  scope.$apply();
		  });
		}
	};
});


app.controller('BuyTicketsCtrl', [
	'$scope',
	'$q',
	'$state',
	'tickets',
	'auth',
	function($scope, $q, $state, tickets, auth) {
		$scope.ticketTypes = ["ADULT_TICKET","HIGHSCHOOL_TICKET","JUNIORHIGH_TICKET","CHILD_TICKET"];
		console.log($scope.foodTypes);
		$scope.tickets = [];
		$scope.numAdultTickets = 1;
		$scope.numTeenTickets = 0;
		$scope.numChildTickets = 0;

		var createTicket = function() {
			var ticket = {
				name: "",
				agegroup: "ADULT_TICKET",
				foodRes: "NONE_FOOD",
				buyer: auth.currentUser(),
				date: Date()
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


app.controller( 'MyAuctionCtrl',[
	'$scope',
	function($scope, $q, $state, tickets) {
		$scope.kidspolicy = 'kidsfree';
		
	}]);
