


app.directive("ngFileSelect",function(){
    return {
        link: function($scope,el){
            el.bind("change", function(e){
                $scope.file = (e.srcElement || e.target).files[0];
                $scope.getFile();
            })
        }
    }
})

app.controller('RegisterCtrl', [
    '$scope',
    '$state',
    '$http',
    'auth',
    'fileReader',
    function($scope, $state, $http, auth, fileReader) {
	$scope.user = {};

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

	$scope.register = function() {
	    picture = $scope.imageSrc;

	    var register = function() {
		auth.register($scope.user).error(function(error) {
		    console.log($scope.user);
		    $scope.error = error;
		}).success(function(data) {
		    $state.go('home');
		});
	    };

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
			$scope.user.photoid = data.data.photoid
			register();
		    });
	    } else {
		register();
	    }
	};
    }]);
