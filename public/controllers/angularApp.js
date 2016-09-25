var app = angular.module('auction', ['ngMessages', 'ui.router', 'pascalprecht.translate', 'ngSanitize', 'stripe.checkout', 'ngMaterial', 'duScroll'])


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
	VEGETARIAN_FOOD: "Vegetarian",
	GLUTENFREE_FOOD: "Gluten-free"
    });
    $translateProvider.preferredLanguage('en');
    $translateProvider.useSanitizeValueStrategy('sanitize');
}]);


var getFullName = function(person) {
    if ( person.firstname && person.lastname )
	return person.firstname + " " + person.lastname;
    return person.name;
};

app.factory('charges', ['$http', 'auth', function($http, auth) {
    var o = {
        charge: function(params)  {
            return $http.post('/chargecustomer', params, {headers: {
		Authorization: "Bearer " + auth.getToken() } });
        }
    };
    return o;
}]);


app.factory('items', ['$http', '$q', function($http, $q) {
    var o = {
    };

    o.performSearch = function(searchterms, sortval) {

	var promises = [];
	var queryString = '';
	if ( !searchterms )
	    searchterms = {};
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
	promises.push($http.get('/all/transactions' ));
	var deferred = $q.defer();
	$q.all(promises).then(function(data) {
            console.log("calls done");
	    var items = [];
	    var tickets_items = data[1].data;
	    var tickets = {};
	    var all_tickets = {};
	    var tickets_arr = [];
            tickets_items.forEach(function(ticket) {
		all_tickets[ticket.bidnumber] = ticket;
		if ( searchterms.buyeremail
		     && searchterms.buyeremail != ticket.login
		     || ( searchterms.searchbuyername && !getFullName(ticket).includes.toLowerCase()(searchterms.searchbuyername.toLowerCase()) )
		     || (searchterms.agegroup && ticket.agegroup != searchterms.agegroup )
		     || (searchterms.dietaryrestrictions && ticket.foodRes != searchterms.dietaryrestrictions) ) {
		    return;
		}
		tickets[ticket.bidnumber] = ticket;
		tickets_arr.push(ticket);
	    });


	    var raw_transactions = data[2].data;
	    var transactions_by_item = {};
	    var transactions_by_bidnum = {};
	    raw_transactions.forEach(function(transaction) {
		if ( searchterms.buyeremail
		     && (!(transaction.bidnumber in tickets)
			 || searchterms.buyeremail != tickets[transaction.bidnumber].login) )
		    return;
		if ( !transactions_by_item[transaction.itemid] )
		    transactions_by_item[transaction.itemid] = [];
		if ( !transactions_by_bidnum[transaction.bidnumber] )
		    transactions_by_bidnum[transaction.bidnumber] = [];
		transactions_by_item[transaction.itemid].push(transaction);
		transactions_by_bidnum[transaction.bidnumber].push(transaction);
	    });

	    data_items = data[0].data;

	    var searchItemType = function(itemtype, search) {
		return !search || (search === 'unassigned' && itemtype == '') || (search == itemtype);
	    };

	    data_items.forEach(function(item) {
                item.eventdate = new Date(item.eventdate);
		if ( (!searchterms.email || item.email == searchterms.email)
		     && searchItemType(item.type, searchterms.searchitemtype)
		     && (!searchterms.searchdonorname || getFullName(item.donor).toLowerCase().includes(searchterms.searchdonorname.toLowerCase()) ) ) {
		    items.push(item);
		    if ( transactions_by_item[item.id] ) {
			item.buyer_emails = transactions_by_item[item.id].map(
			    function(transaction) {
		                return all_tickets[transaction.bidnumber].login;
			    });
			item.concated_emails = item.buyer_emails.join(',');
		    }
		}
	    });
	    var cmp;
            if ( !sortval || sortval == 'date' ) {
		cmp = function(item1, item2) {
		    return new Date(item1.date) - new Date(item2.date)
		};
	    } else if ( sortval == 'itemnumber' ) {
		cmp = function(item1, item2) {
                    if ( !item1.number && !item2.number )
                        return 0;
                    if ( !item1.number )
                        return 1;
                    if ( !item2.number )
                        return -1;
                    return item1.number - item2.number;
		};
	    } else {
		cmp = function(item1, item2) {
                    console.log(item1);
                    if ( !item1.type && !item2.type )
                        return 0;
                    if ( !item1.type )
                        return -1;
                    if ( !item2.type )
                        return 1;
		    return item1.type.toLowerCase().localeCompare(item2.type.toLowerCase());
		}
	    }
	    items.sort(cmp);


	    var tickets_arr_cmp;
	    if ( !sortval || sortval == 'date' ) {
		cmp = function(ticket1, ticket2) {
                    return new Date(ticket2.date) - new Date(ticket1.date);
		};
	    } else if ( sortval == 'bidnum' ) {
		cmp = function(ticket1, ticket2) {
		    return ticket1.bidnumber - ticket2.bidnumber;
		};
	    } else if ( sortval == 'agecategory' ) {
		cmp = function(ticket1, ticket2) {
                    return ticket1.agegroup.localeCompare(ticket2.agegroup);
		};
	    } else if ( sortval == 'food_restriction' ) {
		cmp = function(ticket1, ticket2) {
		    return ticket1.foodRes.localeCompare(ticket2.foodRes);
		};
	    }
	    tickets_arr.sort(cmp);

            console.log("resolving");

	    deferred.resolve({
		items: items,
		tickets: tickets,
		transactions_by_item: transactions_by_item,
		transactions_by_bidnum: transactions_by_bidnum,
		tickets_arr: tickets_arr
	    });
	}, function(err) {
	    deferred.reject(err);
	    console.log("err");
	});
	return deferred.promise;
    };

    return o;
}]);





function guid() {
    function s4() {
	return Math.floor((1 + Math.random()) * 0x10000)
	    .toString(16)
	    .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
	s4() + '-' + s4() + s4() + s4();
}


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

app.filter('currency-no-change', ['$filter', function($filter) {
    return function(num) {

        function isNumeric(num){
            return !isNaN(num)
        }

        if ( isNumeric(num) ) {
            return $filter("currency")(num);
        }
        return num;
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
		var plainNumber = elem.val();//.replace(/[^\d|\-+|\.+]/g, '');
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
	    .state('admin.fixed_price_bid_sheet', {
		url: '/fixed_price_bid_sheet',
		templateUrl: '/templates/fixed_price_bid_sheet.html',
		controller: 'FixedPriceBidSheetCtrl',
		onEnter: [ '$state', 'auth', function($state, auth) {
		    if ( !auth.isLoggedIn() ) {
			$state.go('home');
		    }
		}]
	    })
	    .state('admin.silent_bid_sheets', {
		url: '/silent_bid_sheets',
		templateUrl: '/templates/silent_bid_sheets.html',
		controller: 'SilentBidSheetsCtrl',
		onEnter: [ '$state', 'auth', function($state, auth) {
		    if ( !auth.isLoggedIn() ) {
			$state.go('home');
		    }
		}]
	    })
	    .state('admin.live_catalog', {
		url: '/live_catalog',
		templateUrl: '/templates/live_catalog.html',
		controller: 'LiveCatalogCtrl',
		onEnter: [ '$state', 'auth', function($state, auth) {
		    if ( !auth.isLoggedIn() ) {
			$state.go('home');
		    }
		}]
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

app.controller('ViewPersonNoChangeCtrl',
	       ['$scope',
		function($scope) {
		    $scope.getFullName = getFullName;
	$scope.ticket.date = new Date($scope.ticket.date);
    }]);

app.controller('ViewPersonCtrl', ['$scope',
				  function($scope) {
				      $scope.getFullName = getFullName;
	$scope.ticket.date = new Date($scope.ticket.date);
    }]);


app.controller(
    'AdminHomeCtrl',
    ['auth', '$scope',
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

app.directive('viewpersonNoChange', function() {
    return {
        templateUrl: '/templates/viewperson_nochange.html',
        controller: 'ViewPersonNoChangeCtrl',
        bindings: {
            person: '=',
	    items: '='
        }
    };
});

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
    'items',
    '$mdDialog',
    '$http',
    '$q',
    function($scope, tickets, auth, items, $mdDialog, $http, $q) {
	items.performSearch($scope.searchTerms).then(function(data) {
	    $scope.tickets = data.tickets_arr;
	    $scope.items = data.items;
	    $scope.transactions_by_bidnum = data.transactions_by_bidnum;
            $scope.items_by_itemid = {};
            $scope.items.forEach(function(item) {
                $scope.items_by_itemid[item.id] = item;
            });
	});

	var delete_bidder = function(bidnum) {
	    $http.post("/deletebidder", {bidnumber: bidnum,
                                         transactions: $scope.transactions_by_bidnum[bidnum]}, {headers: {
		Authorization: "Bearer " + auth.getToken() } }).then(
		    function(data) {
			var idx = $scope.tickets.findIndex(function(ticket) {
			    return ticket.bidnumber == bidnum;
			});
			$scope.message = "Bidder " + bidnum + " has been deleted.";
			$scope.tickets.splice(idx,1);
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

	$scope.performSearch = function() {
	    items.performSearch($scope.searchTerms, $scope.sortval).then(function(data) {
		$scope.tickets = data.tickets_arr;
		$scope.items = data.items;
		$scope.transactions_by_bidnum = data.transactions_by_bidnum;
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
    'items',
    function($scope, $http, auth, items) {

	items.performSearch({
	    buyeremail: auth.currentUserEmail()
	}).then(function(data) {
	    console.log(data.tickets_arr);
	    $scope.tickets = data.tickets_arr;
	    $scope.items = data.items;
	    $scope.transactions_by_bidnum = data.transactions_by_bidnum;
            $scope.items_by_itemid = {};
            $scope.items.forEach(function(item) {
                $scope.items_by_itemid[item.id] = item;
            });
	});

	/*
	$http.get("/findtickets/" + auth.currentUser().email).success(function(data) {
	    $scope.tickets = data;
	    $http.get("/all/items").error(
		function(error) {
		    console.log(error);
		    $scope.error = error;
		}).success(function(data) {
		    $scope.items = {};
		    data.forEach(function(item) {
			$scope.items[item.id] = item;
		    });
		});

	}).error(function(error) {
	    console.log(error);
	});
	*/
    }]);

app.controller("MyInvoiceCtrl", [
    '$scope',
    'auth',
    'items',
    function($scope, auth, items) {
	$scope.totalInvoice = 0;
	$scope.getFullName = getFullName;
	items.performSearch({buyeremail: auth.currentUser().email}).then(function(data) {
	    $scope.tickets = data.tickets;
	    $scope.items = data.items;
	    $scope.transactions_by_item = data.transactions_by_item;
	    $scope.transactions_by_bidnum = data.transactions_by_bidnum;

	    $scope.items_by_itemid = {};
	    $scope.items.forEach(function(item) {
		$scope.items_by_itemid[item.id] = item;
	    });

	    for(var key in $scope.tickets) {
		if ( $scope.tickets.hasOwnProperty(key) ) {
		    $scope.transactions_by_bidnum[key].forEach(function(transaction) {
			if ( typeof(transaction.sellprice) == "string" ) {
			    $scope.totalInvoice += Number(transaction.sellprice.substring(1));
			}
			    $scope.totalInvoice += Number(transaction.sellprice);
		    });
		}
	    }
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
    '$document',
    'tickets',
    'charges',
    'auth',
    function($scope, $state, $document, tickets, charges, auth) {
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

            console.log();
            var key = "bottom";
            var elem = angular.element(document.getElementById(key));
            $document.scrollToElementAnimated(elem, 0, 500).then(function() {
            });
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
		    ticket.charge_id = data.data.charge_id;
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


app.controller( 'LiveCatalogCtrl',[
    '$scope',
    'items',
    function($scope, items) {
	items.performSearch({searchitemtype: "silent"}).then(function(data) {
	    $scope.tickets = data.tickets;
	    $scope.items = data.items;
	    $scope.items.forEach(function(item) {
		if ( item.eventdate )
		    item.eventdate = new Date(item.eventdate);
	    });
	    $scope.transactions_by_item = data.transactions_by_item;
	    $scope.getFullName = getFullName;
	});
    }]);

app.controller( 'FixedPriceBidSheetCtrl',[
    '$scope',
    'items',
    function($scope, items) {
        $scope.range = function(num) {
            return new Array(num);
        };

	$scope.getFullName = getFullName;

	items.performSearch({searchitemtype: "fixed"}).then(function(data) {
	    $scope.tickets = data.tickets;
	    $scope.items = data.items;
	    $scope.items.forEach(function(item) {
		if ( item.eventdate )
		    item.eventdate = new Date(item.eventdate);
	    });
	    $scope.transactions_by_item = data.transactions_by_item;
	});
    }]);

app.controller( 'LiveCatalogCtrl',[
    '$scope',
    'items',
    function($scope, items) {
	items.performSearch({searchitemtype: "live"}).then(function(data) {
	    $scope.tickets = data.tickets;
	    $scope.items = data.items;
	    $scope.items.forEach(function(item) {
		if ( item.eventdate )
		    item.eventdate = new Date(item.eventdate);
	    });
	    $scope.transactions_by_item = data.transactions_by_item;
	});
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
		data.forEach(function(item) {
		    if ( item.type == "silent" ) {
			obj.push(item);
			if ( obj.length == 2 ) {
			    $scope.items.push(obj);
			    obj = [];
			}
		    }
		});
		if (obj.length == 1)
		    $scope.items.push(obj)
	    })
    }]);

app.controller('ViewItemGenericCtrl', ["$scope", function($scope) {
    $scope.getFullName = getFullName;
}]);

app.controller('ViewItemAdminCtrl', ['$scope', 'auth', "$http", '$mdDialog', function($scope, auth, $http, $mdDialog) {
    $scope.getFullName = getFullName;
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

    $scope.removeBidderFromItem = function(event, item, transaction) {

	// Appending dialog to document.body to cover sidenav in docs app
	var confirm = $mdDialog.confirm()
	    .title('Are you sure you want to delete this transaction?')
	    .ariaLabel('Confirm Deletion')
	    .targetEvent(event)
	    .ok('Yes! Delete The transaction!')
	    .cancel('No! Whoops!');
	$mdDialog.show(confirm).then(function() {
	    $http.post("/deletetransaction", {
		transactionid: transaction.transactionid
	    }, {headers: {
		Authorization: "Bearer " + auth.getToken()
	    } } ).success(function(data) {
		var index = $scope.transactions_by_item[transaction.itemid].indexOf(transaction);
		$scope.transactions_by_item[transaction.itemid].splice(index,1);
		item.message = "Transaction deleted.";
	    }).error(function(error) {
		item.message = error;
	    });
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


app.controller('InsertBidsCtrl', [
    '$scope',
    'auth',
    'items',
    '$http',
    '$mdDialog',
    '$q',
    function($scope, auth, items, $http, $mdDialog, $q) {

	items.performSearch($scope.searchTerms).then(function(data) {
	    $scope.tickets = data.tickets;
	    $scope.items = data.items;
	    $scope.transactions_by_item = data.transactions_by_item;
	});

	$scope.getFullName = getFullName;

	$scope.performSearch = function() {
	    items.performSearch($scope.searchTerms).then(function(data) {
		$scope.tickets = data.tickets;
		$scope.items = data.items;
		$scope.transactions_by_item = data.transactions_by_item;
	    });
	};

	var addbidder = function(bidnumber, itemid, price) {
	    var content = {
		bidnumber: bidnumber,
		itemid: itemid,
		sellprice: price,
		transactionid: guid()
	    };
	    if ( !(bidnumber in $scope.tickets) ) {
		return $q.resolve();
	    }
	    return $http.post("/addbuyer",content, {headers: {
		Authorization: "Bearer " + auth.getToken() } });
	    /*.success(function(data) {
	      if ( !(itemid in $scope.transactions_by_item) ) {
	      $scope.transactions_by_item[itemid] = [];
	      }
	      $scope.transactions_by_item[itemid].push(content);
	      }).error(function(error) {
	      console.log(error);
	      });
	    */
	};

	$scope.addbidders = function(item) {
	    var arr = item.bidder.split(" ");
	    var promises = [];
	    arr.forEach(function(bidnumber) {
		promises.push(addbidder(bidnumber, item.id, item.price));
	    });
	    $q.all(promises).then(function(data) {
		data.forEach(function(inddata) {
                    if ( !inddata )
                        return;
                    delete item.bidder;
                    delete item.price;
		    var transaction = inddata.data;
		    if ( !(transaction.itemid in $scope.transactions_by_item) )
			$scope.transactions_by_item[transaction.itemid] = [];
		    $scope.transactions_by_item[transaction.itemid].push(transaction);
		});
	    }, function(err)  {
		item.message = err;
	    });
	};

	var findBidder = function(bidnumber) {
	    if ( bidnumber in $scope.tickets )
		return getFullName($scope.tickets[bidnumber]);
	    return "Invalid Bidder";
	};

	$scope.findBidders = function(item) {
	    if ( !item || !item.bidder )
		return []
	    var arr = item.bidder.split(" ");
	    var names = arr.map(findBidder);
	    return names;
	};

	
	$scope.removeBidderFromItem = function(event, item, transaction) {

	    // Appending dialog to document.body to cover sidenav in docs app
	    var confirm = $mdDialog.confirm()
		.title('Are you sure you want to delete this transaction?')
		.ariaLabel('Confirm Deletion')
		.targetEvent(event)
		.ok('Yes! Delete The transaction!')
		.cancel('No! Whoops!');
	    $mdDialog.show(confirm).then(function() {
		$http.post("/deletetransaction", {
		    transactionid: transaction.transactionid
		}, {headers: {
		    Authorization: "Bearer " + auth.getToken()
		} } ).success(function(data) {
		    var index = $scope.transactions_by_item[transaction.itemid].indexOf(transaction);
		    $scope.transactions_by_item[transaction.itemid].splice(index,1);
		    item.message = "Transaction deleted.";
		}).error(function(error) {
		    item.message = error;
		});
	    });
	};

    }]);



app.controller( 'ModifyDonatedItemsCtrl', [
    '$scope',
    'tickets',
    'items',
    'auth',
    '$http',
    '$mdDialog',
    function($scope, tickets, items, auth, $http, $mdDialog) {

	$scope.deleteitem = function(event, item) {
	    
	    // Appending dialog to document.body to cover sidenav in docs app
	    var confirm = $mdDialog.confirm()
		.title('Are you sure you want to delete this item?')
		.ariaLabel('Confirm Deletion')
		.targetEvent(event)
		.ok('Yes! Delete The item!')
		.cancel('No! Whoops!');
	    $mdDialog.show(confirm).then(function() {

		item.transactions = $scope.transactions_by_item[item.id];
		if ( !item.transactions )
		    item.transactions = [];
		$http.post("/deleteitem", item, {headers: {
		    Authorization: "Bearer " + auth.getToken()
		} } ).success(function(data) {
		    var index = $scope.items.indexOf(item);
		    $scope.items.splice(index,1);
		});
	    });
	};
	$scope.searchTerms = {};

	$scope.performSearch = function() {
	    items.performSearch($scope.searchTerms, $scope.sortval).then(function(data) {
		$scope.items = data.items;
		$scope.tickets = data.tickets;
		$scope.transactions_by_item = data.transactions_by_item;
                console.log($scope.items);
	    }, function(err) {
		console.log(err);
	    });
	};

	items.performSearch($scope.searchTerms, $scope.sortval).then(function(data) {
	    $scope.items = data.items;
	    $scope.tickets = data.tickets;
	    $scope.transactions_by_item = data.transactions_by_item;
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
