


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
    function($scope, $state, $http, auth, fileReader, Upload) {
	$scope.user = {};


        $scope.upload = function(files) {
            var file = files[0];
            console.log(file.$ngfName);
            console.log("HERE");
            console.log(file);
            file.upload = Upload.upload({
                url: '/uploadphoto',
                method: "POST",
                headers: {
                    'Content-Type': file.type
                },
                data: {filename: file.name, photo: file},
                file: file
            });

            file.upload.then(function (response) {
                console.log(response);
                file.result = response.data;
            }, function (err) {
                console.log(err);
                if (err.status > 0)
                    $scope.errorMsg = response.status + ': ' + response.data;
            }, function (evt) {
                // Math.min is to fix IE which reports 200% sometimes
                file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
            });

            /*
              file.upload.xhr(function (xhr) {
              // xhr.upload.addEventListener('abort', function(){console.log('abort complete')}, false);
              });
            */

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
		auth.register($scope.user).error(function(error) {
		    console.log($scope.user);
		    $scope.error = error;
		}).success(function(data) {
		    $state.go('home');
		});
	    };
            if ( $scope.picFile.result.photoid )
                $scope.user.photoid = $scope.picFile.result.photoid;

	    register();
x	};
    }]);
