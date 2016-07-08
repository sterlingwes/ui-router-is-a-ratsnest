/* globals angular, _, Promise */
'use strict'

var LOADING_TIME = 2000

angular.module('resolveApp', [
  'ui.router'
])
  .config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider
      .state('layout', {
        url: '',
        abstract: true,
        templateUrl: 'tpl.layout.html',
        controller: 'LayoutController'
      })
      .state('layout.homepage', {
        url: '/homepage?v',
        reloadOnSearch: false,
        resolve: {
          ventures: function ($q, $timeout, pretendImRedux) {
            return pretendImRedux.loadVentures()
          }
        },
        views: {
          content: {
            templateUrl: 'tpl.home.html',
            controller: 'HomepageController'
          },
          modal: {
            template: '<div ui-view="modal"></div>'
          }
        }
      })
      .state('layout.homepage.modal', {
        url: '/modal',
        resolve: {
          ventureDetail: function ($q, $timeout, $stateParams, pretendImRedux) {
            return pretendImRedux.loadDetail($stateParams.v)
          }
        },
        views: {
          modal: {
            templateUrl: 'tpl.modal.html',
            controller: 'ModalController'
          }
        }
      })
  })
  .run(function ($rootScope, $state) {
    $rootScope.loading = true

    $rootScope.$on('$stateChangeError', function (ev, toState, toParams, fromState, fromParams, err) {
      console.error('stateChangeError', err.message)
      switch (err.message) {
        case 'NotFound':
          return $state.go('layout.homepage')
      }
    })
  })
  .controller('LayoutController', function ($scope) {
    // nah
  })
  .controller('HomepageController', function ($scope, $state, $stateParams, ventures) {
    $scope.ventures = ventures
    $scope.selections = {}
    var selectedVentures = $stateParams.v

    if (selectedVentures) {
      if (typeof selectedVentures === 'string') selectedVentures = [selectedVentures]
      selectedVentures.forEach(function (id) {
        id = parseInt(id, 10)
        $scope.selections[id] = true
      })
    }

    function updateParams (id, state) {
      id = id.toString()
      var currentParams = typeof $stateParams.v === 'string' ? [ $stateParams.v ] : $stateParams.v || []
      if (!state) currentParams = _.without(currentParams, id)
      else currentParams = currentParams.concat(id)
      var newParams = _.extend({}, $stateParams, { v: currentParams })
      $state.go('layout.homepage', newParams, { notify: false, replace: true })
    }

    $scope.toggleVenture = function (ev, id) {
      if (ev.target.tagName !== 'INPUT') return
      var currentCheckState = $scope.selections[id]
      updateParams(id, currentCheckState)
    }

    $scope.getVentureName = function (id) {
      id = parseInt(id, 10)
      var venture = ventures.find(function (v) {
        return v.id === id
      })
      return venture ? venture.name : 'UNKNOWN'
    }
  })

  .controller('ModalController', function ($scope, $state, ventureDetail, pretendImRedux) {
    $scope.ventures = _.map(pretendImRedux.getState().ventures, 'name').join(', ')
    $scope.ventureContacts = _.values(ventureDetail).join(', ')

    $scope.close = function () {
      $state.go('layout.homepage')
    }
  })

  .config(['$urlRouterProvider',
    function ($urlRouterProvider) {
      $urlRouterProvider.otherwise('/homepage')
    }
  ])

  .factory('pretendImRedux', function ($timeout, $q) {
    var $get = fakeAjax.bind($q, $timeout)

    var state = {
      ventures: []
    }

    var actions = {
      loadVentures: function () {
        return $get('ventures')
          .then(function (ventures) {
            state.ventures = ventures.slice(0)
            return ventures
          })
      },

      loadDetail: function (ids) {
        return $get('ventureDetail', ids)
      },

      getState: function () {
        return state
      }
    }

    return actions
  })

  .directive('resolveSpinner', function ($rootScope, $timeout) {
    return {
      restrict: 'E',
      replace: true,
      template: '<div class="sk-folding-cube ng-hide"><div class="sk-cube1 sk-cube"></div><div class="sk-cube2 sk-cube"></div><div class="sk-cube4 sk-cube"></div><div class="sk-cube3 sk-cube"></div></div>',
      link: function (scope, element) {
        $rootScope.$on('$stateChangeStart', function (event, currentRoute, prevRoute) {
          console.log(arguments)
          if (!prevRoute) return
          $timeout(function () {
            element.removeClass('ng-hide')
          })
        })

        $rootScope.$on('$stateChangeSuccess', function () {
          element.addClass('ng-hide')
        })
      }
    }
  })

function getById (obj, ids) {
  if (!ids) return
  ids = typeof ids === 'string' ? [ids] : ids
  return _.pick(obj, ids)
}

function fakeAjax ($timeout, request, ids) {
  var resources = {
    ventures: [
      { id: 1, name: 'Acme Co.' },
      { id: 2, name: 'Dubstep Inc.' },
      { id: 3, name: 'X Collection Corporation' }
    ],
    ventureDetail: {
      '1': 'Sarah',
      '2': 'Dave',
      '3': 'Pat'
    }
  }

  console.log('making request for', request)

  var deferred = this.defer()
  var response = resources[request]
  if (ids) {
    response = getById(response, ids)
  }

  $timeout(function () {
    if (!response) return deferred.reject(new Error('NotFound'))
    console.log('resolved', request)
    deferred.resolve(response)
  }, LOADING_TIME)

  return deferred.promise
}
