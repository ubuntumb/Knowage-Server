/*
Knowage, Open Source Business Intelligence suite
Copyright (C) 2016 Engineering Ingegneria Informatica S.p.A.

Knowage is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

Knowage is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
 * @authors Giovanni Luca Ulivo (GiovanniLuca.Ulivo@eng.it)
 * v0.0.1
 * 
 */
(function(){

angular.module('cockpitModule').directive('datasetSelector',function($compile){
	   return{
		   templateUrl: baseScriptPath+ '/directives/commons/dataset-selector/templates/datasetSelector.html',
		   transclude: true,
		   replace: true,		  
		   scope:{
			   ngModel:"=",
			   extended:"=?",
			   onChange:"&",
			   datasetTypeAvailable:"=?",
			   datasetTypeExclusion:"=?"
		   },
		   compile: function (tElement, tAttrs, transclude) {
                return {
                    pre: function preLink(scope, element, attrs, ctrl, transclud) {
                    },
                    post: function postLink(scope, element, attrs, ctrl, transclud) {
                    	
                    }
                };
		   	},
		    controller: datasetSelectorControllerFunction,
		   
	   }
});

function datasetSelectorControllerFunction($scope,cockpitModule_datasetServices,sbiModule_translate,sbiModule_restServices){
	$scope.translate=sbiModule_translate;
	$scope.availableDatasets=cockpitModule_datasetServices.getAvaiableDatasets();
	$scope.addNewDataset=function(){
		 cockpitModule_datasetServices.addDataset(undefined,$scope.availableDatasets,false,true,$scope.datasetTypeAvailable || undefined,$scope.datasetTypeExclusion || undefined)
		 .then(function(data){
			 $scope.availableDatasets=cockpitModule_datasetServices.getAvaiableDatasets();
			 $scope.ngModel=data.id.dsId;
			 $scope.onChange({dsId:data.id.dsId});
		 });
	}
	$scope.cancelDataset=function(){
		delete $scope.ngModel;
	}
	$scope.getMetaData = function(id){
		if(id){
			sbiModule_restServices.restToRootProject();
			var params = cockpitModule_datasetServices.getDatasetParameters(id);
			for(var p in params){
				if(params[p].length == 1){
					params[p] = params[p][0];
				}
			}
			sbiModule_restServices.promisePost("2.0/datasets", encodeURIComponent(cockpitModule_datasetServices.getDatasetLabelById(id)) + "/data",params && JSON.stringify({"parameters": params}))
				.then(function(data){
					$scope.dataset = data.data;
				})
		}else {
			$scope.dataset = {};
		}
		
	}
	
	$scope.isDatasetAvailable = function(ds){
		if($scope.datasetTypeExclusion){
			for(var e in $scope.datasetTypeExclusion){
				if($scope.datasetTypeExclusion[e].type == ds.type){
					if($scope.datasetTypeExclusion[e].configuration){
						if(ds.configuration[$scope.datasetTypeExclusion[e].configuration.property] == $scope.datasetTypeExclusion[e].configuration.value) return false;
						else return true;
					}	
					return false;
				}else return true;
			}
		}
		if($scope.datasetTypeAvailable){
			for(var a in $scope.datasetTypeAvailable){
				if($scope.datasetTypeAvailable[a].type == ds.type){
					if($scope.datasetTypeAvailable[a].configuration){
						if(ds.configuration[$scope.datasetTypeAvailable[a].configuration.property] == $scope.datasetTypeAvailable[a].configuration.value) return true;
						else return false;
					}	
					return true;
				}else return false;
			}
		}
		return true;
	}
	
	if($scope.extended){
		$scope.getMetaData($scope.ngModel);
	}
	
	var metaDataWatcher = $scope.$watch('ngModel',function(newValue,oldValue){
		if($scope.extended && newValue!=oldValue){
			$scope.getMetaData(newValue);
		}
	})
	
	
};

})();