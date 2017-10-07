


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
    "Upload",
    "Constants",
    function($scope, $state, $http, auth, fileReader, Upload, Constants) {
	$scope.user = {};



        $scope.upload = function(files) {
            upload_photo(auth, Constants, Upload, $http, files, $scope.user, $scope);
        };

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
	    if ( $scope.password != $scope.confirmPassword )
		return;
	    picture = $scope.imageSrc;

	    var register = function() {
                console.log('here');
		auth.register($scope.user).error(function(error) {
		    console.log($scope.user);
		    $scope.error = error;
		}).success(function(data) {
		    $state.go('home');
		});
	    };
            if ( $scope.picFile && $scope.picFile.result && $scope.picFile.result.photoid )
                $scope.user.photoid = $scope.picFile.result.photoid;

	    register();
	};
    }]);
