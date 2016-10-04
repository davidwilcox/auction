
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
    "$mdDialog",
    'auth',
    'fileReader',
    function($scope, $state, $http, $window, $mdDialog, auth, fileReader) {

	$scope.showIdeas = function(ev) {
	    $mdDialog.show({
		clickOutsideToClose: true,
		templateUrl: '/templates/donation_ideas.html',
		ariaLabel: 'Alert Dialog Demo',
		targetEvent: ev,
		fullscreen: true
	    });
	};

	$scope.eventMinDate = new Date(2016, 10, 13);
	$scope.eventMaxDate = new Date(2017, 11, 31);

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

	    var picture = $scope.imageSrc;


	    submit_item = function() {
		// persist user info.
		$window.localStorage['donor-info'] = $scope.donor;
		$scope.item.donor = $scope.donor;
		$scope.item.email = auth.currentUserEmail();
                $scope.item.date = new Date();

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
		filename = $scope.file.name;
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
