angular.module('measureRoleManager').controller('measureRoleMetadataController', [ '$scope','sbiModule_translate' ,'sbiModule_restServices','sbiModule_messaging',measureRoleMetadataControllerFunction ]);

function measureRoleMetadataControllerFunction($scope,sbiModule_translate,sbiModule_restServices,sbiModule_messaging){
	$scope.hierarchicalLevelList=[];
	$scope.AttributeCategoryList=[];
	 
	sbiModule_restServices.promiseGet("2.0/domains","listByCode/KPI_RULEOUTPUT_TYPE")
	.then(function(response){ 
		angular.copy(response.data,$scope.tipologiesType); 
	},function(response){
		 $scope.errorHandler(response.data,sbiModule_translate.load("sbi.kpi.rule.load.generic.error")+" domains->KPI_RULEOUTPUT_TYPE"); 
	});
	
	sbiModule_restServices.promiseGet("2.0/domains","listByCode/TEMPORAL_LEVEL")
	.then(function(response){ 
		angular.copy(response.data,$scope.hierarchicalLevelList);
	},function(response){
		 $scope.errorHandler(response.data,sbiModule_translate.load("sbi.kpi.rule.load.generic.error")+" domains->TEMPORAL_LEVEL"); 
	});
	
	sbiModule_restServices.promiseGet("2.0/domains","listByCode/KPI_MEASURE_CATEGORY")
	.then(function(response){ 
		angular.copy(response.data,$scope.AttributeCategoryList);
	},function(response){
		 $scope.errorHandler(response.data,sbiModule_translate.load("sbi.kpi.rule.load.generic.error")+" domains->KPI_MEASURE_CATEGORY"); 
	});
	
	$scope.querySearchCategory=function(query){
		  var results = query ? $scope.AttributeCategoryList.filter( createFilterFor(query) ) : [];
		  results.push({valueCd:angular.uppercase(query)})
	      return results;
	}
	
	 function createFilterFor(query) {
	      var lowercaseQuery = angular.lowercase(query);
	      return function filterFn(state) {
	        return (angular.lowercase(state.valueCd).indexOf(lowercaseQuery) === 0);
	      };
	    }
	
	
}