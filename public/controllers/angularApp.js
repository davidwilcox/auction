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



app.factory('tickets', ['$http', function($http) {

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

// allow you to format a text input field.
// <input type="text" ng-model="test" format="number" />
// <input type="text" ng-model="test" format="currency" />
app.directive('format', ['$filter', function ($filter) {
    return {
	require: '?ngModel',
	link: function (scope, elem, attrs, ctrl) {
	    if (!ctrl) return;
	    
	    ctrl.$formatters.unshift(function (a) {
		return $filter(attrs.format)(ctrl.$modelValue)
	    });

	    elem.bind('blur', function(event) {
		var plainNumber = elem.val().replace(/[^\d|\-+|\.+]/g, '');
		elem.val($filter(attrs.format)(plainNumber));
	    });
	}
    };
}]);


app.directive('phoneInput', function($filter, $browser) {
    return {
        require: 'ngModel',
        link: function($scope, $element, $attrs, ngModelCtrl) {
	    var listener = function() {
	        var value = $element.val().replace(/[^0-9]/g, '');
                $element.val($filter('tel')(value, false));
            };

            // This runs when we update the text field
            ngModelCtrl.$parsers.push(function(viewValue) {
		return viewValue.replace(/[^0-9]/g, '').slice(0,10);
            });

            // This runs when the model gets updated on the scope directly and keeps our view in sync
            ngModelCtrl.$render = function() {
                $element.val($filter('tel')(ngModelCtrl.$viewValue, false));
            };

            $element.bind('change', listener);
            $element.bind('keydown', function(event) {
		var key = event.keyCode;
                // If the keys include the CTRL, SHIFT, ALT, or META keys, or the arrow keys, do nothing.
                // This lets us support copy and paste too
                if (key == 91 || (15 < key && key < 19) || (37 <= key && key <= 40)){
                    return;
                }
                $browser.defer(listener); // Have to do this or changes don't get picked up properly
            });

            $element.bind('paste cut', function() {
                $browser.defer(listener);
            });
        }

    };
});



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
	    .state('admin.modifydonateditems', {
		url: '/modifydonateditems',
		templateUrl: '/templates/modifydonateditems.html',
		controller: 'ModifyDonatedItemsCtrl'
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
	    .state('viewdonateditems', {
		url: '/viewdonateditems',
		templateUrl: '/templates/viewdonateditems.html',
		controller: 'ViewDonatedItemsCtrl'
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
    'auth',
    '$http',
    '$mdDialog',
    '$q',
    function($scope, tickets, auth, $http, $mdDialog, $q) {
	tickets.getAll().then(
	    function(result) {
		$scope.tickets = result;
		console.log(result);
	    });



	var promises = [];
	promises.push($http.get("/all/items"));
	promises.push($http.get("/all/transactions"));
	$scope.transactions_by_bidder = new Map();

	$q.all(promises).then(function(data) {
	    console.log(data);
	    data[1].data.forEach(function(transaction) {
		if ( !$scope.transactions_by_bidder[transaction.bidnumber] )
		    $scope.transactions_by_bidder[transaction.bidnumber] = [];
		$scope.transactions_by_bidder[transaction.bidnumber].push(transaction);
	    });
	    $scope.items = {};
	    data[0].data.forEach(function(item) {
		console.log(item);
		$scope.items[item.id] = item;
	    });
	}, function(err) {
	    console.log(error);
	    $scope.error = error;
	});

	var delete_bidder = function(bidnum) {
	    var idx = $scope.tickets.findIndex(function(ticket) {
		return ticket.bidnumber == bidnum;
	    });
	    $http.post("/deletebidder", $scope.tickets[idx], {headers: {
		Authorization: "Bearer " + auth.getToken() } }).then(
		    function(data) {
			$scope.message = "Bidder " + bidnum + " has been deleted.";
			$scope.tickets.splice(idx,1);
			console.log($scope.tickets);
		    }, function(err) {
			$scope.message = err;
		    });
	};
	$scope.confirm_delete = function(ev, bidnum) {
	    // Appending dialog to document.body to cover sidenav in docs app
	    var confirm = $mdDialog.confirm()
	        .title('Are you sure you want to delete this bidder?')
	        .textContent('Even after deleting, you will still need to refund the bidder the money they paid for entrance to the auction. You probably want to log into stripe to do this.')
	        .ariaLabel('Confirm Deletion')
	        .targetEvent(ev)
	        .ok('Yes! Delete The Bidder!')
	        .cancel('No! Whoops!');
	    $mdDialog.show(confirm).then(function() {
		delete_bidder(bidnum);
	    }, function() {
	    });
	};
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
		itemid: item.id,
		price: item.price
	    };
	    console.log(content);
	    $http.get('/findticket/' + item.bidder, {
		cache: true
	    }).then(function(data) {
		if ( data.data != '' ) {
		    $http.post("/addbuyer",content, {headers: {
			Authorization: "Bearer " + auth.getToken() } }).success(function(data) {
			    item.message = data.message;
			}).error(function(error) {
			    item.message = error;
			});
		}
	    });
	};

	$scope.findBidder = function(item) {
	    $http.get('/findticket/' + item.bidder, {
		cache: true
	    }).then(function(data) {
		console.log(data);
		if ( data.data == '' )
		    item.foundbidder = {name: "Invalid bidder"};
		else
		    item.foundbidder = data.data;
	    }, function(err) {
		item.foundbidder = {name: "Invalid bidder"};
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
    '$state',
    'tickets',
    'charges',
    'auth',
    function($scope, $state, tickets, charges, auth) {
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
	};

	$scope.currentUserEmail = auth.currentUserEmail();

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

		console.log(data.data.customer_id);

		$scope.tickets.forEach(function(ticket) {
		    ticket.customer_id = data.data.customer_id;
		    if ( auth.isLoggedIn() )
		        ticket.login = auth.currentUser().email;
		    else
		        ticket.login = "a@a.a";
	        });

		console.log($scope.tickets);

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

    $scope.isAdmin = auth.isAdmin;

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

    $scope.removeBidderFromItem = function(item, transaction) {
        console.log("removing");
        $http.post("/deletetransaction", {
            transactionid: transaction.id
        }, {headers: {
	    Authorization: "Bearer " + auth.getToken()
        } } ).success(function(data) {
	    var index = $scope.transactions_by_item[transaction.itemid].indexOf(transaction);
	    $scope.transactions_by_item[transaction.itemid].splice(index,1);
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


app.factory('items', ['$http', '$q', function($http, $q) {
    var o = {
    };
    o.performSearch = function(searchterms) {

	var promises = [];
	var queryString = '';
	if ( searchterms.searchname )
	    queryString += "?searchname=" + searchterms.searchname;
	if ( searchterms.searchitemnumber ) {
	    if ( queryString )
		queryString += "&";
	    else
		queryString += "?";
	    queryString += "searchitemnumber=" + searchterms.searchitemnumber;
	}
	promises.push($http.get('/allitems' + queryString));
	promises.push($http.get('/all/tickets'));
	promises.push($http.get('/all/transactions'));
	var deferred = $q.defer();
	$q.all(promises).then(function(data) {
	    var items = [];
	    var tickets_items = data[1].data;
	    var tickets = {};
	    tickets_items.forEach(function(ticket) {
		tickets[ticket.bidnumber] = ticket;
	    });


	    var raw_transactions = data[2].data;
	    var transactions_by_item = {};
	    raw_transactions.forEach(function(transaction) {
		if ( !transactions_by_item[transaction.itemid] )
		    transactions_by_item[transaction.itemid] = [];
		transactions_by_item[transaction.itemid].push(transaction);
	    });

	    data_items = data[0].data;
	    console.log(data_items);
	    data_items.forEach(function(item) {
		if ( !searchterms.email || item.email == searchterms.email ) {
		    items.push(item);
		    if ( transactions_by_item[item.id] ) {
			item.buyer_emails = transactions_by_item[item.id].map(
			    function(transaction) {
				return tickets[transaction.bidnumber].login;
			    });
			item.concated_emails = item.buyer_emails.join(',');
		    }
		}
	    });
	    items.sort(function(item1, item2) {
		return new Date(item1.date) > new Date(item2.date);
	    });
	    deferred.resolve({
		items: items,
		tickets: tickets,
		transactions_by_item: transactions_by_item});
	}, function(err) {
	    deferred.reject(err);
	    console.log("err");
	});
	return deferred.promise;
    };

    return o;
}]);


app.controller( 'ModifyDonatedItemsCtrl', [
    '$scope',
    'tickets',
    'items',
    'auth',
    function($scope, tickets, items, auth) {

	$scope.deleteitem = function(item) {
	    item.transactions = $scope.transactions_by_item[item.id];
	    $http.post("/deleteitem", item, {headers: {
		Authorization: "Bearer " + auth.getToken()
	    } } ).success(function(data) {
		var index = $scope.items.indexOf(item);
		$scope.items.splice(index,1);
	    });
	};

	items.performSearch({
	    searchname: $scope.searchname,
	    searchitemnumber: $scope.searchitemnumber
	}).then(function(data) {
	    console.log("HERE");
	    $scope.items = data.items;
	    $scope.tickets = data.tickets;
	    $scope.transactions_by_item = data.transactions_by_item;
	    console.log($scope.items);
	}, function(err) {
	    console.log(err);
	});
    }]);


app.controller( 'ViewDonatedItemsCtrl',[
    '$scope',
    'auth',
    'items',
    function($scope, auth, items) {

	items.performSearch({
	}).then(function(data) {
	    $scope.items = data.items;
	    $scope.tickets = data.tickets;
	    $scope.transactions_by_item = data.transactions_by_item;
	}, function(err) {
	    console.log(err);
	});	    
    }]);

app.controller( 'MyDonatedItemsCtrl',[
    '$scope',
    'auth',
    'items',
    function($scope, auth, items) {

	items.performSearch({
	    email: auth.currentUserEmail()
	}).then(function(data) {
	    $scope.items = data.items;
	    $scope.tickets = data.tickets;
	    $scope.transactions_by_item = data.transactions_by_item;
	}, function(err) {
	    console.log(err);
	});	    
    }]);
