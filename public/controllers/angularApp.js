var app = angular.module('auction', ['ngMessages', 'ui.router', 'pascalprecht.translate', 'ngSanitize', 'stripe.checkout', 'ngMaterial'])


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

app.factory('items', ['$http', function($http) {
    var o = {
        get: function(itemid)  {
            return $http.post('/items', [itemid]);
        }
    };
    return o;
}]);


app.factory('charges', ['$http', 'auth', function($http, auth) {
    var o = {
        charge: function(params)  {
            return $http.post('/chargecustomer', params, {headers: {
		Authorization: "Bearer " + auth.getToken() } });
        }
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
		return data.data;
	    }, function(data) {
		console.log("ERROR");
	    });
	    return rtval;
	},

        get: function(bidnumber) {
            rtval = $http.post('/tickets', [bidnumber]);
            return rtval;
        }
    };
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
	    .state('admin.viewregisteredpeople', {
		url: '/viewregisteredpeople',
		templateUrl: '/templates/viewregisteredpeople.html',
		controller: 'ViewRegisteredPeopleCtrl'
	    })
	    .state('admin.viewdonateditems', {
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
	    .state('admin.insertbids', {
		url: '/insertbids',
		templateUrl: '/templates/insertbids.html',
		controller: 'InsertBidsCtrl',
		onEnter: [ '$state', 'auth', function($state, auth) {
		    if ( !auth.isLoggedIn() ) {
			$state.go('home');
		    }
		}]
	    })
	    .state('myauction.mytickets', {
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
	    .state('admin', {
		    url: '/admin',
			templateUrl: '/templates/admin_home.html',
			controller: 'AdminHomeCtrl'
		})
	    .state('myauction.myinvoice', {
		url: '/myinvoice',
		templateUrl: '/templates/myinvoice.html',
		controller: 'MyInvoiceCtrl',
		onEnter: [ '$state', 'auth', function($state, auth) {
		    if ( !auth.isLoggedIn() ) {
			$state.go('home');
		    }
		}]
	    })
	    .state('admin.add_admin', {
		url: '/add_admin',
		templateUrl: '/templates/add_admin.html',
		controller: 'AddAdminCtrl',
		onEnter: [ '$state', 'auth', function($state, auth) {
		    if ( !auth.isAdmin() ) {
			$state.go('home');
		    }
		}]
            })
	    .state('myauction.mydonateditems', {
		url: '/mydonateditems',
		templateUrl: '/templates/viewdonateditems.html',
		controller: 'MyDonatedItemsCtrl',
		onEnter: [ '$state', 'auth', function($state, auth) {
		    if ( !auth.isLoggedIn() ) {
			$state.go('home');
		    }
		}]
            }).state('viewticket', {
                url: '/viewticket/{bidnumber}',
                templateUrl: '/templates/viewticket.html',
                controller: 'ViewTicketCtrl',
                resolve: {
                    ticket: ['$stateParams', 'tickets',
                             function($stateParams, items) {
                               return items.get($stateParams.bidnumber);
                           }],
                    items: ['$http', function($http) {
                        return $http.get('/all/items');
                    }]
                }
	    }).state('viewitem', {
                url: '/viewitem/{itemid}',
                templateUrl: '/templates/viewitem.html',
                controller: 'ViewItemCtrl',
                resolve: {
                    post: ['$stateParams', 'items',
                           function($stateParams, items) {
                               return items.get($stateParams.itemid);
                           }],
                    item_tickets: ['$http', function($http) {
                        return $http.get('/all/tickets');
                    }]
                }
            });


	$urlRouterProvider.otherwise('home');
    }]);

app.controller('ViewPersonCtrl', [
    function() {
    }]);


app.controller('AdminHomeCtrl', ['auth', '$scope',
				 function(auth, $scope) {
		       $scope.isAdmin = auth.isAdmin;
		   }]);

app.controller(
    'AddAdminCtrl',
    ['$http', '$scope', 'auth', '$mdDialog', function($http, $scope, auth, $mdDialog) {
	    $scope.addAdmin = function(email) {
		$http.post('/addadmin', {email: email}, {headers: {
			    Authorization: "Bearer " + auth.getToken() } }).then(function(res) {
				    $mdDialog.show(
						   $mdDialog.alert()
						   .parent(angular.element(document.querySelector('#popupContainer')))
						   .clickOutsideToClose(true)
						   .title('Admin user added.')
						   .ok('Got it!'));
				}, function(err) {
				    $mdDialog.show(
						   $mdDialog.alert()
						   .parent(angular.element(document.querySelector('#popupContainer')))
						   .clickOutsideToClose(true)
						   .title('Error encountered')
						   .textContent(err)
						   .ok('Got it!'));
				});
	    };
	    
	}]);

app.directive('viewperson', function() {
    return {
        templateUrl: '/templates/viewperson.html',
        controller: 'ViewPersonCtrl',
        bindings: {
            person: '=',
            items: '='
        }
    };
});


app.controller('ViewTicketCtrl', [
    '$scope',
    '$state',
    'ticket',
    'items',
    function($scope, $state, ticket, items) {
        $scope.ticket = ticket.data[0];
        $scope.items = {};
	items.data.forEach(function(item) {
	    $scope.items[item.id] = item;
	});
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


app.controller('HomeCtrl', [
    '$scope',
    '$state',
    'auth',
    function($scope, $state, auth) {
	$scope.isLoggedIn = auth.isLoggedIn;
	this.isLoggedIn = auth.isLoggedIn;
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
    o.isAdmin = function() {
	if ( o.isLoggedIn() ) {
	    var user = o.currentUser();
	    if ( user.admin )
		return true;
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
    'charges',
    'auth',
    function($scope, $q, $state, tickets, charges, auth) {
	$scope.ticketTypes = ["ADULT_TICKET","HIGHSCHOOL_TICKET","JUNIORHIGH_TICKET","CHILD_TICKET"];
	console.log($scope.ticketTypes);
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

        $scope.calculateTotal = function() {
            return $scope.numAdultTickets*16
                +$scope.numHighSchoolTickets*12
                +$scope.numJuniorHighTickets*6
                +$scope.numChildTickets*6;
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

        $scope.doCheckout = function(token) {
            var promises = [];
	    $scope.submitProgress = 0;
            charges.charge({
                purchaser: auth.currentUser().email,
                stripe_token: token.id,
                amount: $scope.calculateTotal()*100
            }).then(function(data) {
		$scope.submitProgress = 10;

		$scope.tickets.forEach(function(ticket) {
		    ticket.customer_id = data.data.customer_id;
		    if ( auth.isLoggedIn() )
		        ticket.login = auth.currentUser().email;
		    else
		        ticket.login = "a@a.a";
	        });

		var purchase_ticket = function(num) {
		    tickets.purchase($scope.tickets[num]).then(function(data) {
			if ( num == $scope.tickets.length - 1 ) {
			    $state.go('buyticketsconfirmation');
			} else {
			    purchase_ticket(num+1);
			}
		    }, function(err) {
			console.log(err);
		    });
		};
		purchase_ticket(0);
            }, function(err) {
                console.log(err);
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

app.controller('ViewItemGenericCtrl', [function() {}]);

app.controller('ViewItemAdminCtrl', ['$scope', 'auth', "$http", function($scope, auth, $http) {

    $scope.saveitem = function(item) {
        delete item.message;
        $http.post("/submititem", item, {headers: {
            Authorization: "Bearer " + auth.getToken()
        } } ).success(function(data) {
            item.message = "Item changed!";
        }).error(function(error) {
            item.message = error;
        });
    };

    $scope.removeBidderFromItem = function(item, bidder) {
        console.log("removing");
        $http.post("/deletebidderfromitem", {
            itemid: item.id,
            bidnum: bidder
        }, {headers: {
        } } ).success(function(data) {
            item.message = "Bidder deleted.";
        }).error(function(error) {
            item.message = error;
        });
    };

    $scope.policies = ["KIDSFREE","KIDSFREECOUNT","EVERYBODYCOUNTS","THREEPRICES","OVER14","OVER21","KIDSPARTY"];
}]);


app.directive('viewitem', function() {
    return {
        templateUrl: '/templates/viewitemgeneric.html',
        controller: 'ViewItemGenericCtrl',
        bindings: {
            tickets: '=',
            item: '='
        }
    };
});


app.directive('viewitemadmin', function() {
    return {
        templateUrl: '/templates/viewitemadmin.html',
        controller: 'ViewItemAdminCtrl',
        bindings: {
            tickets: '=',
            item: '='
        }
    };
});


app.controller('ViewItemCtrl', [
    '$scope',
    '$state',
    'post',
    'item_tickets',
    function($scope, $state, post, ticket_items) {
        $scope.item = post.data[0];
	$scope.tickets = {};
	ticket_items.data.forEach(function(ticket) {
	    $scope.tickets[ticket.bidnumber] = ticket;
	});
    }]);


app.controller( 'ViewDonatedItemsCtrl', [
    '$scope',
    '$q',
    'tickets',
    '$http',
    'auth',
    function($scope, $q, tickets, $http, auth) {

	$scope.performSearch = function() {
	    console.log("performing");
	    delete $scope.items;
	    delete $scope.tickets;

	    var promises = [];
	    var queryString = '';
	    if ( $scope.searchname )
		queryString += "?searchname=" + $scope.searchname;
	    if ( $scope.searchitemnumber ) {
		if ( queryString )
		    queryString += "&";
		else
		    queryString += "?";
		queryString += "searchitemnumber=" + $scope.searchitemnumber;
	    }
	    promises.push($http.get('/allitems' + queryString));
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
	};
	$scope.performSearch();
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
