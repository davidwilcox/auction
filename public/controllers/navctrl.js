
app.controller('NavCtrl', [
    '$scope', 'auth', function($scope, auth) {
	this.isLoggedIn = auth.isLoggedIn;
	this.isAdmin = auth.isAdmin;
	this.currentUser = auth.currentUserEmail;
	this.logOut = auth.logOut;
    }]);

