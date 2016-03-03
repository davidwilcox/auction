var app = angular.module('auction', ['ui.router'])

app.config([
    '$stateProvider',
    '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {

        $stateProvider
            .state('home', {
                url: '/home',
                templateUrl: '/templates/home.html',
                controller: 'MainCtrl'
            })
            .state('register', {
                url: '/register',
                templateUrl: '/templates/adduser.html',
                controller: 'AddUserCtrl'
            })

        $urlRouterProvider.otherwise('home');
    }]);


app.controller('MainCtrl', [
    '$scope',
    function($scope){

    }]);


app.controller('AddUserCtrl', [
    '$scope',
    function($scope){

    }]);
