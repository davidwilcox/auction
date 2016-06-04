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
			.state('insertbids', {
				url: '/insertbids',
				templateUrl: '/templates/insertbids.html',
				controller: 'InsertBidsCtrl',
				onEnter: [ '$state', 'auth', function($state, auth) {
					if ( !auth.isLoggedIn() ) {
						$state.go('home');
					}
				}]
			})
			.state('mytickets', {
				url: '/mytickets',
				templateUrl: '/templates/mytickets.html',
				controller: 'MyTicketsCtrl',
				onEnter: [ '$state', 'auth', function($state, auth) {
					if ( !auth.isLoggedIn() ) {
						$state.go('home');
					}
				}]
			})
			.state('silent_bid_sheets', {
				url: '/silent_bid_sheets',
				templateUrl: '/templates/silent_bid_sheets.html',
				controller: 'SilentBidSheetsCtrl',
				onEnter: [ '$state', 'auth', function($state, auth) {
					if ( !auth.isLoggedIn() ) {
						$state.go('home');
					}
				}]
			})
			.state('myinvoice', {
				url: '/myinvoice',
				templateUrl: '/templates/myinvoice.html',
				controller: 'MyInvoiceCtrl',
				onEnter: [ '$state', 'auth', function($state, auth) {
					if ( !auth.isLoggedIn() ) {
						$state.go('home');
					}
				}]
			})
			.state('mydonateditems', {
				url: '/mydonateditems',
				templateUrl: '/templates/viewdonateditems.html',
				controller: 'MyDonatedItemsCtrl',
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

app.controller("MyTicketsCtrl", [
	'$scope',
	'$http',
	'auth',
	function($scope, $http, auth) {
		$http.get("/findtickets/" + auth.currentUser().email).success(function(data) {
			$scope.tickets = data;
			$http.get("/all/items").error(
				function(error) {
					console.log(error);
					$scope.error = error;
				}).success(function(data) {
					$scope.items = {};
					data.forEach(function(item) {
						console.log(item);
						$scope.items[item.id] = item;
					});
				});

		}).error(function(error) {
			console.log(error);
		});
	}]);

app.controller("MyInvoiceCtrl", [
	'$scope',
	'$http',
	'auth',
	function($scope, $http, auth) {
		$scope.totalInvoice = 0;
		$http.get("/findtickets/" + auth.currentUser().email).success(function(data) {
			$scope.tickets = data;
			$http.get("/all/items").error(
				function(error) {
					console.log(error);
					$scope.error = error;
				}).success(function(data) {
					$scope.totalInvoice = 0;
					$scope.items = {};
					data.forEach(function(item) {
						console.log(item);
						$scope.items[item.id] = item;
					});
					$scope.tickets.forEach(function(ticket) {
						ticket.boughtitems.forEach(function(item) {
							$scope.totalInvoice += $scope.items[item].price;
						});
					});
				});

		}).error(function(error) {
			console.log(error);
		});
	}]);


app.controller('InsertBidsCtrl', [
	'$scope',
	'$http',
	'auth',
	function($scope, $http, auth) {
		$http.get("/all/items").success(function(data) {
			$scope.items = data;
		}).error(function(error) {
			$scope.error = error;
		});
		$scope.updatesellprice = function(item) {
			content = {
				itemid: item.id,
				price: item.price
			};
			$http.post("/updatesellprice", content, {headers: {
				Authorization: "Bearer " + auth.getToken() } }).success(function(data) {
					$scope.message = data;
				}).error(function(error) {
					$scope.error = error;
				});
		};
		$scope.addbidder = function(item) {
			content = {
				guestid: item.bidder,
				itemid: item.id
			};
			$http.post("/addbuyer",content, {headers: {
				Authorization: "Bearer " + auth.getToken() } }).success(function(data) {
				$scope.message = data;
			}).error(function(error) {
				$scope.error = error;
			});
		};
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
		$scope.imageurl = auth.currentUser().photoid;
		$scope.itemMaxLength = 30;
		$scope.descriptionMaxLength = 200;
		user = auth.currentUser();
		if ( user ) {
			$scope.donor = user;
		} else if ( $window.localStorage['donor-info'] ) {
			$scope.donor = $window.localStorage['donor-info'];
		}


		$scope.fileNameChanged = function(ele) {
			$scope.donor.filename = ele.files[0].name;
		};

		$scope.donateitem = function() {

			picture = $scope.donor.picture;
			filename = $scope.donor.filename;
			delete $scope.donor.picture;
			delete $scope.donor.filename;



			submit_item = function() {
				// persist user info.
				console.log("submit");
				$window.localStorage['donor-info'] = $scope.donor;
				$scope.item.donor = $scope.donor;

				$http.post('/submititem', $scope.item,{headers: {
					Authorization: "Bearer " + auth.getToken() } }).success(function(data) {
						$state.go('home');
					}).error(function(error) {
						console.log('error');
						$scope.error = error;
					});
			};
			payload = {
				"photo": picture,
				"filename": filename
			};

			$scope.donor.photoid = $scope.imageurl;

			if ( picture ) {
				console.log("first");
				$http.post('/uploadphoto', payload).error(
					function(error) {
						$scope.error = error;
					}).then(function(data) {
						$scope.donor.photoid = data.data.photoid
						submit_item();
					});
			} else {
				console.log("second");
				submit_item();
			}
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

		$scope.fileNameCha39nged = function(ele) {
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
	'$http',
	function($scope, tickets, $http) {
		tickets.getAll().then(
			function(result) {
				$scope.tickets = result;
				console.log(result);
			});
		$http.get("/all/items").error(
			function(error) {
				console.log(error);
				$scope.error = error;
			}).success(function(data) {
				$scope.items = {};
				data.forEach(function(item) {
					console.log(item);
					$scope.items[item.id] = item;
				});
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
		$scope.numHighSchoolTickets = 0;
		$scope.numJuniorHighTickets = 0;
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
			var highSchoolTickets = 0;
			var juniorHighTickets = 0;
			var childTickets = 0;
			$scope.tickets.forEach(function(ticket) {
				switch (ticket.agegroup) {
				case "ADULT_TICKET":
					adultTickets++;
					break;
				case "HIGHSCHOOL_TICKET":
					highSchoolTickets++;
					break;
				case "JUNIORHIGH_TICKET":
					juniorHighTickets++;
					break;
				case "CHILD_TICKET":
					childTickets++;
					break;
				}
			});

			$scope.numAdultTickets = adultTickets;
			$scope.numHighSchoolTickets = highSchoolTickets;
			$scope.numJuniorHighTickets = juniorHighTickets;
			$scope.numChildTickets = childTickets;
		};

		$scope.purchase = function() {
			var promises = [];
			$scope.tickets.forEach(function(ticket) {
				if ( auth.isLoggedIn() )
					ticket.login = auth.currentUser().email;
				else
					ticket.login = "a@a.a";
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
	function($scope) {
	}]);

app.controller( 'SilentBidSheetsCtrl',[
	'$scope',
	'$http',
	function($scope, $http) {
		$scope.myarr = [['a','b'],['c','d'],['e','f']];
		$http.get("/all/items").error(
			function(error) {
				console.log(error);
				$scope.error = error;
			}).success(function(data) {
				$scope.items = [];
				obj = [];
				console.log(data);
				data.forEach(function(item) {
					obj.push(item);
					if ( obj.length == 2 ) {
						$scope.items.push(obj);
						obj = [];
					}
				});
				if (obj.length == 1)
					$scope.items.push(obj)
				console.log($scope.items.length);
			})
	}]);



app.controller( 'ViewDonatedItemsCtrl',[
	'$scope',
	'$q',
	'tickets',
	'$http',
	'auth',
	function($scope, $q, tickets, $http, auth) {
		var promises = [];
		promises.push($http.get('/all/items'));
		promises.push($http.get('/all/tickets'));
		$q.all(promises).then(function(data) {
			$scope.items = {};
			data_items = data[0].data;
			data_items.forEach(function(item) {
			    $scope.items[item.id] = item;
			});
                    tickets_items = data[1].data;
		    $scope.tickets = {};
			tickets_items.forEach(function(ticket) {
				$scope.tickets[ticket.bidnumber] = ticket;
			});
			console.log($scope.items);
			console.log($scope.tickets);
		}, function(err) {
			console.log("err");
		});
	}]);


app.controller( 'MyDonatedItemsCtrl',[
	'$scope',
	'$q',
	'tickets',
	'$http',
	'auth',
	function($scope, $q, tickets, $http, auth) {
		var promises = [];
		promises.push($http.get('/all/items'));
		promises.push($http.get('/all/tickets'));
		$q.all(promises).then(function(data) {
			$scope.items = {};
			data_items = data[0].data;
			data_items.forEach(function(item) {
				if ( item.donor.email == auth.currentUserEmail() ) {
					$scope.items[item.id] = item;
				}
			});

			tickets_items = data[1].data;
			$scope.tickets = {};
			tickets_items.forEach(function(ticket) {
				$scope.tickets[ticket.bidnumber] = ticket;
			});
			console.log($scope.items);
			console.log($scope.tickets);
		}, function(err) {
			console.log("err");
		});
	}]);
