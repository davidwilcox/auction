
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

app.filter('tel', function () {
    return function (tel) {
        if (!tel) { return ''; }

        var value = tel.toString().trim().replace(/^\+/, '');

        if (value.match(/[^0-9]/)) {
            return tel;
        }

        var country, city, number;

        switch (value.length) {
            case 1:
            case 2:
            case 3:
                city = value;
                break;

            default:
                city = value.slice(0, 3);
                number = value.slice(3);
        }

        if(number){
            if(number.length>3){
                number = number.slice(0, 3) + '-' + number.slice(3,7);
            }
            else{
                number = number;
            }

            return ("(" + city + ") " + number).trim();
        }
        else{
            return "(" + city;
        }

    };
});

app.controller('DonateItemCtrl', [
    '$scope',
    '$state',
    '$http',
    '$window',
    'auth',
    'fileReader',
    function($scope, $state, $http, $window, auth, fileReader) {

        $scope.getFile = function () {
            $scope.progress = 0;
            fileReader.readAsDataUrl($scope.file, $scope)
                .then(function(result) {
                    $scope.imageSrc = result;
                });
        };

        $scope.$on("fileProgress", function(e, progress) {
            $scope.progress = progress.loaded / progress.total;
        });

	$scope.policies = ["KIDSFREE","KIDSFREECOUNT","EVERYBODYCOUNTS","THREEPRICES","OVER14","OVER21","KIDSPARTY"];
	$scope.item = {
	    name: ''
	};
	$scope.imageurl = auth.currentUser().photoid;
        $scope.itemMaxLength = 50;
	$scope.descriptionMaxLength = 500;
	user = auth.currentUser();
	if ( user ) {
	    $scope.donor = user;
	} else if ( $window.localStorage['donor-info'] ) {
	    $scope.donor = $window.localStorage['donor-info'];
	}

	$scope.donateitem = function() {

	    picture = $scope.imageSrc;
	    filename = $scope.file.name;


	    submit_item = function() {
		// persist user info.
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

	    $scope.donor.photoid = $scope.imageurl;

	    if ( picture ) {
                payload = {
		    "photo": picture,
		    "filename": filename
	        };
		$http.post('/uploadphoto', payload).error(
		    function(error) {
			$scope.error = error;
		    }).then(function(data) {
			$scope.donor.photoid = data.data.photoid
			submit_item();
		    });
	    } else {
		submit_item();
	    }
	};
    }]);
