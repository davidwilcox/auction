var app = angular.module('auction', ['ngMessages', 'ui.router', 'pascalprecht.translate', 'ngSanitize', 'stripe.checkout', 'ngMaterial', 'duScroll', 'ngFileUpload', 'app.config'])



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
	PREK_TICKET: "Pre-K",
	NONE_FOOD: "Regular",
	VEGETARIAN_FOOD: "Vegetarian",
	VEGAN: "Vegan",
	GLUTENFREE_FOOD: "Gluten-free"
    });
    $translateProvider.preferredLanguage('en');
    $translateProvider.useSanitizeValueStrategy('sanitize');
}]);

var get_resized_image_url = function(urlin) {
    var img = document.createElement("img");
    img.src = urlin;

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    var MAX_WIDTH = 800;
    var MAX_HEIGHT = 600;
    var width = img.width;
    var height = img.height;

    if (width > height) {
        if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
        }
    } else {
        if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
        }
    }
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);

    var dataurl = canvas.toDataURL("image/jpg")
    return dataurl;
};

var upload_photo = function(auth, Constants, Upload, $http, files, user, $scope) {
    var file = files[0];

    var reader = new FileReader();
    reader.onload = function(e){
        $scope.encoded_file = btoa(e.target.result.toString());
    };
    reader.readAsDataURL(file);
    reader.onload = function() {

        var dataurl = get_resized_image_url(reader.result);

        file.upload = Upload.http({
            url: Constants.apiUrl() + '/uploadphoto',
            method: "POST",
            headers: {
                'Content-Type': "application/json"//file.type
            },
            data: {filename: file.name, photo: dataurl}
        });

        file.upload.then(function (response) {
            file.result = response.data;
            var photoid = file.result.photoid;
            console.log(photoid);

            $http.post(Constants.apiUrl() + '/replace_user_photo_id', {
		email: auth.currentUserEmail(),
		photoid: file.result.photoid
	    }).then(function(data) {
                if ( user ) {
		    user.photoid = photoid;
                    auth.saveUser(user);
                }
		$scope.message = "Upload successful.";
	    }, function(err) {
		$scope.message = err;
	    });

        }, function (err) {
            console.log(err);
            if (err.status > 0)
                $scope.errorMsg = response.status + ': ' + response.data;
        }, function (evt) {
            // Math.min is to fix IE which reports 200% sometimes
            file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
        });

    };
};


var getFullName = function(person) {
    if ( person.firstname && person.lastname )
	return person.firstname + " " + person.lastname;
    return person.name;
};

app.factory('charges', function($http, auth, Constants) {
    var o = {
        charge: function(params)  {
            return $http.post(Constants.apiUrl() + '/chargecustomer', params, {headers: {
		Authorization: "Bearer " + auth.getToken() } });
        }
    };
    return o;
});


app.factory('items', function($http, $q, Constants) {
    var o = {
    };

    o.performSearch = function(searchterms, sortval) {

	var promises = [];
	var queryString = '';
	if ( !searchterms )
	    searchterms = {};
	if ( searchterms.searchitemnumber ) {
	    if ( queryString )
		queryString += "&";
	    else
		queryString += "?";
	    queryString += "searchitemnumber=" + searchterms.searchitemnumber;
	}
	promises.push($http.get(Constants.apiUrl() + '/allitems' + queryString));
	promises.push($http.get(Constants.apiUrl() + '/all/tickets'));
	promises.push($http.get(Constants.apiUrl() + '/all/transactions' ));
	var deferred = $q.defer();
	$q.all(promises).then(function(data) {
	    var items = [];
	    var tickets_items = data[1].data;
	    var tickets = {};
	    var all_tickets = {};
	    var tickets_arr = [];
	    console.log(tickets_items);
	    console.log(data);
	    tickets_items.forEach(function(ticket) {
		all_tickets[ticket.bidnumber] = ticket;
		if ( searchterms.buyeremail
		     && searchterms.buyeremail != ticket.login
		     || ( searchterms.searchbuyername && !getFullName(ticket) )
		     || ( searchterms.searchbuyername && !getFullName(ticket).toLowerCase().includes(searchterms.searchbuyername.toLowerCase()) )
		     || (searchterms.agegroup && ticket.agegroup != searchterms.agegroup )
		     || (searchterms.dietaryrestrictions && ticket.foodRes != searchterms.dietaryrestrictions)
		     || searchterms.maxBidNumber && ticket.bidnumber > searchterms.maxBidNumber ) {
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
		if ( item.eventdate )
		    item.eventdate = new Date(item.eventdate);
		if ( item.date )
		    item.date = new Date(item.date);
		if ( (!searchterms.email || item.email == searchterms.email)
		     && (!searchterms.multiples || item.quantity > 1)
		     && searchItemType(item.type, searchterms.searchitemtype)
		     && (!searchterms.searchdonorname || getFullName(item.donor).toLowerCase().includes(searchterms.searchdonorname.toLowerCase()))
		     && (!searchterms.searchname || item.name.toLowerCase().includes(searchterms.searchname.toLowerCase()))) {
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
		    if ( !item1.date && !item2.date )
			return 0;
		    if ( !item1.date )
			return 1;
		    if ( !item2.date )
			return -1;
		    return item2.date.getTime() - item1.date.getTime()
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
	    } else if ( sortval == "lastname" ) {
		cmp = function(item1, item2) {
		    if ( !item1.donor.lastname && !item2.donor.lastname )
			return 0;
		    if ( !item1.donor.lastname )
			return 1;
		    if ( !item2.donor.lastname )
			return -1;
		    return item1.donor.lastname.toLowerCase().localeCompare(item2.donor.lastname.toLowerCase());
		};
	    } else {
		cmp = function(item1, item2) {
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
	    } else if ( sortval == "lastname" ) {
		console.log(sortval);
		cmp = function(ticket1, ticket2) {
		    // these checks should not be necessary, but for some reason people
		    // get tickets in without names.
		    if ( !ticket1.lastname && !ticket2.lastname )
			return 0;
		    if ( !ticket1.lastname )
			return 1;
		    if ( !ticket2.lastname )
			return -1;
		    return ticket1.lastname.toLowerCase().localeCompare(ticket2.lastname.toLowerCase());
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
});





function guid() {
    function s4() {
	return Math.floor((1 + Math.random()) * 0x10000)
	    .toString(16)
	    .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
	s4() + '-' + s4() + s4() + s4();
}


app.factory('tickets', function($http, Constants) {

    return {
	purchase: function(ticket) {
	    return $http.post(Constants.apiUrl() + '/createguest', ticket);
	},

	getAll: function() {
	    rtval = $http.get(Constants.apiUrl() + '/all/tickets').then(function(data) {
		return data.data;
	    }, function(data) {
		console.log("ERROR");
	    });
	    return rtval;
	}
    };
});

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

 

app.filter('currencyNoChange', ['$filter', function($filter) {
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

	console.log("H");

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
		onEnter: function($state, auth) {
		    if ( !auth.isAdmin() )
			$state.go('home');
		}
	    })
	    .state('modifydonateditems', {
		url: '/modifydonateditems',
		templateUrl: '/templates/modifydonateditems.html',
		controller: 'ModifyDonatedItemsCtrl',
		onEnter: function($state, auth) {
		    if ( !auth.isAdmin() )
			$state.go('home');
		}
	    })
	    .state('fixed_price_bid_sheet', {
		url: '/fixed_price_bid_sheet',
		templateUrl: '/templates/fixed_price_bid_sheet.html',
		controller: 'FixedPriceBidSheetCtrl',
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
	    .state('bid_cards', {
		url: '/bid_cards',
		templateUrl: '/templates/bid_cards.html',
		controller: 'BidCardsCtrl',
		onEnter: [ '$state', 'auth', function($state, auth) {
		    if ( !auth.isAdmin() ) {
			$state.go('home');
		    }
		}]
	    })
	    .state('live_catalog', {
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
	    .state('donateitemconfirmation', {
		url: '/donateitemconfirmation',
		templateUrl: '/templates/donateitemconfirmation.html',
		controller: 'DonateItemsConfirmationCtrl'
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
 	    }).state('charge_for_items', {
		url: '/charge_for_items',
		templateUrl: "/templates/charge_for_items.html",
		controller: 'ChargeForAllItemsCtrl',
		onEnter: function($state, auth) {
		    if ( !auth.isAdmin() ) {
			$state.go('home');
		    }
		}
	    })
	    .state('add_admin', {
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
		templateUrl: '/templates/mydonateditems.html',
		controller: 'MyDonatedItemsCtrl',
		onEnter: [ '$state', 'auth', function($state, auth) {
		    if ( !auth.isLoggedIn() ) {
			$state.go('home');
		    }
		}]
            }).state('myauction.myprofile', {
		url: '/myprofile',
		templateUrl: '/templates/myprofile.html',
		controller: 'MyProfileCtrl'
	    }).state('viewticket', {
                url: '/viewticket/{bidnumber}',
                templateUrl: '/templates/viewticket.html',
                controller: 'ViewTicketCtrl',
                resolve: {
                    ticket: ['$stateParams', 'tickets',
                             function($stateParams, items) {
                               return items.get($stateParams.bidnumber);
                           }],
                    items: ['$http', "Constants", function($http, Constants) {
                        return $http.get(Constants.apiUrl() + '/all/items');
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
                    item_tickets: ['$http', "Constants", function($http, Constants) {
                        return $http.get(Constants.apiUrl() + '/all/tickets');
                    }]
                }
            }).state('forgot_password', {
		url: '/forgot_password',
		templateUrl: '/templates/forgot_password.html',
		controller: 'ForgotPasswordCtrl'
	    }).state('reset_password', {
		url: '/reset_password/{email}/{token}',
		templateUrl: '/templates/reset_password.html',
		controller: 'ResetPasswordCtrl'
	    });


	$urlRouterProvider.otherwise('home');
    }]);



app.controller(
    'ResetPasswordCtrl',
    function($http, $scope, $stateParams, $state, Constants) {
	 $scope.password = '';
	 $scope.confirmPassword = '';
	 $scope.message = '';
	 $scope.resetPassword = function() {
	     $http.post(Constants.apiUrl() + '/reset_password', {
		 email: $stateParams.email,
		 lost: $stateParams.token,
		 password: $scope.password
	     }).then(function(data) {
		 if ( data.data.changed ) {
		     $scope.message = "Your password has been reset.";
		 } else {
		     $scope.error = "Token provided is incorrect.";
		 }
	     }, function(err) {
		 $scope.error = error;
	     });
	 };
     });

app.controller(
    'ForgotPasswordCtrl',
    function($scope, $http, Constants) {
	$scope.register = function() {
	    $http.post(Constants.apiUrl() + '/lost_password', {email: $scope.email})
		.then(function(data) {
		    $scope.message = "An email has been sent to you to reset your password."
		}, function(err) {
		    $scope.message = err;
		});
	};
    });

app.controller('ViewPersonNoChangeCtrl',
	       ['$scope',
		function($scope) {
		    $scope.getFullName = getFullName;
	$scope.ticket.date = new Date($scope.ticket.date);
    }]);

app.controller(
    'ViewPersonCtrl',
    function($scope, $http, auth, Constants) {
	$scope.getFullName = getFullName;
	$scope.ticket.date = new Date($scope.ticket.date);
	$scope.ageCategories = ["ADULT_TICKET", "HIGHSCHOOL_TICKET", "JUNIORHIGH_TICKET", "CHILD_TICKET", "PREK_TICKET"];
	$scope.allFoodRestrictions = ["NONE_FOOD","VEGETARIAN_FOOD","VEGAN"];
	$scope.saveticket = function(ticket) {
	    $http.post(Constants.apiUrl() + "/modify_ticket", {ticket: ticket}, {headers: {
		Authorization: "Bearer " + auth.getToken()
	    } }).then(function(data) {
		$scope.message = "Item Saved";
	    }, function(err) {
		$scope.message = err;
	    });
	};
    });


app.controller(
    'AdminHomeCtrl',
    function(auth, $scope) {
	$scope.isAdmin = auth.isAdmin;
     });

app.controller(
    'AddAdminCtrl',
    function($http, $scope, auth, $mdDialog, Constants) {
	$scope.addAdmin = function(email) {
	    $http.post(Constants.apiUrl() + '/addadmin', {email: email}, {headers: {
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
	
    });

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

app.controller(
    "BidCardsCtrl",
    function($scope, items) {
	items.performSearch({maxBidNumber: 1000}, "lastname").then(function(data) {
	    $scope.tickets = data.tickets_arr;
	});
	$scope.getFullName = getFullName;
    });

app.controller('ViewRegisteredPeopleCtrl', [
    '$scope',
    'tickets',
    'auth',
    'items',
    '$mdDialog',
    '$http',
    '$q',
    "Constants",
    function($scope, tickets, auth, items, $mdDialog, $http, $q, Constants) {
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
	    $http.post(Constants.apiUrl() + "/deletebidder", {bidnumber: bidnum,
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
    "$mdDialog",
    function($scope, $state, auth, $mdDialog) {
	$scope.isLoggedIn = auth.isLoggedIn;
	this.isLoggedIn = auth.isLoggedIn;

	
	 
	$scope.showIdeas = function(ev) {
	    $mdDialog.show({
		clickOutsideToClose: true,
		templateUrl: '/templates/donation_ideas.html',
		ariaLabel: 'Alert Dialog Demo',
		targetEvent: ev,
		fullscreen: true
	    });
	};
    }]);


app.controller("DonateItemsConfirmationCtrl", [
    '$scope',
    function($scope) {
	
    }]);

app.controller("BuyticketsconfirmationCtrl", [
    '$scope',
    function($scope) {
	
    }]);

app.controller("MyTicketsCtrl", [
    '$scope',
    'auth',
    'items',
    function($scope, auth, items) {

	items.performSearch({
	    buyeremail: auth.currentUserEmail()
	}).then(function(data) {
	    $scope.tickets = data.tickets_arr;
	    $scope.items = data.items;
	    $scope.transactions_by_bidnum = data.transactions_by_bidnum;
            $scope.items_by_itemid = {};
            $scope.items.forEach(function(item) {
                $scope.items_by_itemid[item.id] = item;
            });
	});
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
		if ( $scope.transactions_by_bidnum.hasOwnProperty(key) ) {
		    $scope.transactions_by_bidnum[key].forEach(function(transaction) {
			if ( transaction.sellprice[0] == "$" ) {
			    $scope.totalInvoice += Number(transaction.sellprice.substring(1));
			} else {
                            $scope.totalInvoice += Number(transaction.sellprice);
                        }
		    });
		}
	    }
	});
    }]);


app.factory('auth', function($http, $window, $q, Constants) {
    var o = {
    };
    o.saveToken = function(token) {
	$window.localStorage['auction-token'] = token;
    };
    o.getToken = function() {
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
        console.log("HERE");
	if ( user.confirmPassword == user.password ) {
	    return $http.post(Constants.apiUrl() + '/register', user).success(function(data) {
                console.lg("MATCH");
		o.saveToken(data.token);

		var payload = JSON.parse($window.atob(o.getToken().split('.')[1]));
		console.log(payload.user);
		o.saveUser(payload.user);
	    }).error(function(data) {
                console.log("DELETING");
		delete user['confirmPassword'];
	    });
	}
	$q.reject("password and confirm password did not match.");
    };
    o.logIn = function(user) {
	return $http.post(Constants.apiUrl() + '/login', user).success(function(data) {
	    o.saveToken(data.token);
	    var payload = JSON.parse($window.atob(o.getToken().split('.')[1]));
	    console.log(payload.user);
	    o.saveUser(payload.user);
	});
    };
    o.logOut = function(user) {
	$window.localStorage.removeItem('auction-token');
	$window.localStorage.removeItem('auction-user');
    };
    o.saveUser = function(user) {
	$window.localStorage['auction-user'] = JSON.stringify(user);
    };
    o.currentUserEmail = function(){
	if(o.isLoggedIn()) {
	    return JSON.parse($window.localStorage['auction-user']).email;
	}
    };
    o.currentUser = function() {
	if(o.isLoggedIn()) {
	    return JSON.parse($window.localStorage['auction-user']);
	}
    };
    return o;
});

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
                console.log("ERROR");
                console.log(error);
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
    "$mdDialog",
    function($scope, $state, $document, tickets, charges, auth, $mdDialog) {
	$scope.ticketTypes = ["ADULT_TICKET","HIGHSCHOOL_TICKET","JUNIORHIGH_TICKET","CHILD_TICKET", "PREK_TICKET"];
	console.log($scope.ticketTypes);
	$scope.tickets = [];
	$scope.numAdultTickets = 1;
	$scope.numHighSchoolTickets = 0;
	$scope.numJuniorHighTickets = 0;
	$scope.numChildTickets = 0;
        $scope.bardonation = 0;
        $scope.numPrekTickets = 0;

	$scope.showBarHelp = function(ev) {
	    $mdDialog.show({
		clickOutsideToClose: true,
		templateUrl: '/templates/bar_help.html',
		ariaLabel: 'Alert Dialog Demo',
		targetEvent: ev,
		fullscreen: true
	    });
	};


	var createTicket = function() {
	    var ticket = {
		agegroup: "ADULT_TICKET",
		foodRes: "NONE_FOOD",
		buyer: auth.currentUser(),
		date: Date(),
		gluten: false,
		login: auth.isLoggedIn() ? auth.currentUser().email : "NONE"
	    };
	    return ticket;
	};

	$scope.currentUserEmail = function() {
            return auth.isLoggedIn() ? auth.currentUserEmail() : $scope.tickets[0].login;
        }

	var initializeTickets = function() {
	    $scope.tickets = [];
	    $scope.tickets[0] = createTicket();
            if ( auth.isLoggedIn() ) {
	        $scope.tickets[0].firstname = auth.currentUser().firstname;
	        $scope.tickets[0].lastname = auth.currentUser().lastname;
            }
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
                +$scope.numJuniorHighTickets*5
                +$scope.numChildTickets*5
                +$scope.numPrekTickets*0
                +($scope.bardonation == "" || isNaN($scope.bardonation) ? 0 : parseFloat($scope.bardonation));
        };

	$scope.computeOrderDetails = function() {
	    var adultTickets = 0;
	    var highSchoolTickets = 0;
	    var juniorHighTickets = 0;
	    var childTickets = 0;
	    var prekTickets = 0;
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
		case "PREK_TICKET":
		    prekTickets++;
		    break;
		}
	    });

	    $scope.numAdultTickets = adultTickets;
	    $scope.numHighSchoolTickets = highSchoolTickets;
	    $scope.numJuniorHighTickets = juniorHighTickets;
	    $scope.numChildTickets = childTickets;
	    $scope.numPrekTickets = prekTickets;
	};

        $scope.doCheckout = function(token) {
            var promises = [];
	    $scope.submitProgress = 0;
            console.log("CHARGING");
            charges.charge({
                purchaser: auth.isLoggedIn() ? auth.currentUser().email : $scope.tickets[0].login,
                stripe_token: token.id,
                amount: $scope.calculateTotal()*100,
		tickets: $scope.tickets,
                bar_donation: $scope.bardonation
            }).then(function(data) {
		console.log(data);
		$state.go('buyticketsconfirmation');
            }, function(err) {
                console.log(err);
            });

        };

    }]);


app.controller( 'MyAuctionCtrl',[
    '$scope',
    function($scope) {
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
		if ( typeof item.quantity == "string" )
		    item.quantity = parseInt(item.quantity);
	    });
	    $scope.transactions_by_item = data.transactions_by_item;
	});
    }]);

app.controller( 'LiveCatalogCtrl',[
    '$scope',
    'items',
    function($scope, items) {
	items.performSearch({searchitemtype: "live"}, "itemnumber").then(function(data) {
	    $scope.tickets = data.tickets;
	    $scope.items = data.items;
	    $scope.items.forEach(function(item) {
		if ( item.eventdate )
		    item.eventdate = new Date(item.eventdate);
	    });
	    $scope.transactions_by_item = data.transactions_by_item;
	    $scope.getFullName = getFullName;
	    $scope.today = new Date();
	});
    }]);

app.controller( 'SilentBidSheetsCtrl',[
    '$scope',
    "items",
    function($scope, items) {
	$scope.getFullName = getFullName;
	items.performSearch({serachitemtype: "silent"}, "lastname").then(function(data) {
	    $scope.items = [];
	    obj = [];
	    data.items.forEach(function(item) {
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
	});
    }]);

app.controller('ViewItemGenericCtrl', ["$scope", function($scope) {
    $scope.getFullName = getFullName;
}]);


app.controller('ViewItemMyOwnCtrl', ["$scope", function($scope) {
    $scope.getFullName = getFullName;
}]);



app.controller('ViewItemAdminCtrl', function($scope, auth, $http, $mdDialog, Upload, Constants) {
    $scope.getFullName = getFullName;
    $scope.isAdmin = auth.isAdmin;

    $scope.saveitem = function(item) {
        delete item.message;
        $http.post(Constants.apiUrl() + "/submititem", item, {headers: {
            Authorization: "Bearer " + auth.getToken()
        } } ).success(function(data) {
            item.message = "Item changed!";
        }).error(function(error) {
            item.message = error;
        });
    };


    $scope.showBuyers = function(ev) {
	console.log("THERE");

	$mdDialog.show( {
	    templateUrl: "/templates/view_item_buyers.html",
	    controller: DialogController,
	    parent: angular.element(document.body),
	    targetEvent: ev,
	    clickOutsideToClose: true,
	    locals: {
		transactions_by_item: $scope.transactions_by_item,
		item: $scope.item,
		tickets: $scope.tickets
	    }
	});
    };


    var DialogController = function($scope, transactions_by_item, item, tickets) {
	$scope.transactions_by_item = transactions_by_item;
	$scope.item = item;
	$scope.tickets = tickets;

	$scope.removeBidderFromItem = function(event, item, transaction) {

	    // Appending dialog to document.body to cover sidenav in docs app
	    var confirm = $mdDialog.confirm()
		.title('Are you sure you want to delete this transaction?')
		.ariaLabel('Confirm Deletion')
		.targetEvent(event)
		.ok('Yes! Delete The transaction!')
		.cancel('No! Whoops!');
	    $mdDialog.show(confirm).then(function() {
		$http.post(Constants.apiUrl() + "/deletetransaction", {
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

    };




    $scope.upload = function(files,item) {
        var file = files[0];

        var reader = new FileReader();
        reader.onload = function(e){
            $scope.encoded_file = btoa(e.target.result.toString());
        };
        reader.readAsDataURL(file);
        reader.onload = function() {

            var dataurl = get_resized_image_url(reader.result);

            file.upload = Upload.http({
                url: Constants.apiUrl() + '/uploadphoto',
                method: "POST",
                headers: {
                    'Content-Type': "application/json"//file.type
                },
                data: {filename: file.name, photo: dataurl}
            });

            file.upload.then(function (response) {
                file.result = response.data;

                var photoid = file.result.photoid;
                item.donor.photoid = photoid;
                return $scope.saveitem(item);

            }, function (err) {
                console.log(err);
                if (err.status > 0)
                    $scope.errorMsg = response.status + ': ' + response.data;
            }, function (evt) {
                // Math.min is to fix IE which reports 200% sometimes
                file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
            });

        };
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
	    $http.post(Constants.apiUrl() + "/deletetransaction", {
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
});


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

app.directive('viewitemmyown', function() {
    return {
        templateUrl: '/templates/viewitemmyown.html',
        controller: 'ViewItemMyOwnCtrl',
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
    "Constants",
    function($scope, auth, items, $http, $mdDialog, $q, Constants) {

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
	    return $http.post(Constants.apiUrl() + "/addbuyer",content, {headers: {
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
		$http.post(Constants.apiUrl() + "/deletetransaction", {
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
    "Constants",
    function($scope, tickets, items, auth, $http, $mdDialog, Constants) {

	
	$scope.copyitem = function(item) {
	    var newitem = JSON.parse(JSON.stringify(item));
	    delete newitem.message;
	    newitem.id = guid();
	    $http.post(Constants.apiUrl() + "/submititem", newitem, {headers: {
		Authorization: "Bearer " + auth.getToken()
	    } } ).success(function(data) {
		item.message = "Item duplicated.";
		$scope.items.push(newitem);
	    }).error(function(error) {
		item.message = error;
	    });
	};


	$scope.deleteitem = function(event, item) {
	    
	    // Appending dialog to document.body to cover sidenav in docs app
	    var confirm = $mdDialog.confirm()
		.title('Are you sure you want to delete this item?')
		.ariaLabel('Confirm Deletion')
		.targetEvent(event)
		.ok('Yes! Delete The item!')
		.cancel('No! Whoops!');
	    $mdDialog.show(confirm).then(function() {

		console.log(item);
		item.transactions = $scope.transactions_by_item[item.id];
		if ( !item.transactions )
		    item.transactions = [];
		$http.post(Constants.apiUrl() + "/deleteitem", item, {headers: {
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


app.controller("ChargeForAllItemsCtrl",[
    "$scope",
    "$http",
    "$mdDialog",
    'auth',
    "items",
    "Constants",
    function($scope, $http, $mdDialog, auth, items, Constants) {

	items.performSearch({
	}).then(function(data) {
	    var s = '';
	    var emails = [];
	    for(var idx in data.tickets) {
		var ticket = data.tickets[idx];
		if ( ticket.buyer )
		    emails.push(ticket.buyer.email);
	    }
	    emails.sort();
	    emails = emails.filter(function(item, pos, ary) {
		return !pos || item != ary[pos - 1];
	    });
	    emails.forEach(function(email) {
		s += email + ",";
	    });
	    $scope.email_string = s;
	}, function(err) {
	    console.log(err);
	    $scope.message = err;
	});


	$scope.charge = function(event) {

	    // Appending dialog to document.body to cover sidenav in docs app
	    var charge = $mdDialog.confirm()
		.title('Are you sure you want to charge all users?')
		.ariaLabel('Confirm Charge')
		.targetEvent(event)
		.ok('Yes! Charge all purchasers!')
		.cancel('No! Whoops!');
	    $mdDialog.show(charge).then(function() {
		$http.post(Constants.apiUrl() + "/charge_all_users", {headers: {
		    Authorization: "Bearer " + auth.getToken()
		} } ).success(function(data) {
		    $scope.message = "Success! Go check stripe now.";
		}).error(function(error) {
		    $scope.message = error;
		});
	    });
	};

	$scope.send_item_emails = function(event) {

	    var dialog = $mdDialog.confirm()
		.title("Send emails?")
		.ariaLabel('Confirm Send.')
		.targetEvent(event)
		.ok('Yes! Send emails!')
		.cancel('No! Whoops!');
	    $mdDialog.show(dialog).then(function() {
		$http.post(Constants.apiUrl() + "/send_item_emails", {headers: {
		    Authorization: 'Bearer ' + auth.getToken()
		} }).success(function(data) {
		    $scope.message = 'Success!';
		}).error(function(error) {
		    $scope.message = error;
		});
	    });
	};

	$scope.send_invoice = function(event) {

	    // Appending dialog to document.body to cover sidenav in docs app
	    var charge = $mdDialog.confirm()
		.title('Are you sure you want to send an invoice to all users?')
		.ariaLabel('Confirm Send')
		.targetEvent(event)
		.ok('Yes! Send the invoice!')
		.cancel('No! Whoops!');
	    $mdDialog.show(charge).then(function() {
		$http.post(Constants.apiUrl() + "/send_invoice", {headers: {
		    Authorization: "Bearer " + auth.getToken()
		} } ).success(function(data) {
		    $scope.message = "Success!";
		}).error(function(error) {
		    $scope.message = error;
		});
	    });
	};

    }]);


app.controller('MyProfileCtrl',[
    '$scope',
    'fileReader',
    'auth',
    '$http',
    "Upload",
    "Constants",
    function($scope, fileReader, auth, $http, Upload, Constants) {

	$scope.user = auth.currentUser();

        $scope.upload = function(files) {
            upload_photo(auth, Constants, Upload, $http, files, $scope.user, $scope);
        };
    }]);
