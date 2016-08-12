
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
