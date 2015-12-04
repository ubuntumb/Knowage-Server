var geoM=angular.module('geoModule',['ngMaterial','ngAnimate','angular_table','sbiModule','mdColorPicker']);

geoM.factory('geoModule_dataset',function(){
	var ds={};
	return ds;
});

geoM.factory('geModule_datasetJoinColumnsItem',function(){
	var dsjc={};
	return dsjc;
});

geoM.factory('geoModule_indicators',function(){
	var gi=[];
	return gi;
});

geoM.factory('geoModule_filters',function(){
	var gi=[];
	return gi;
});


geoM.factory('$map',function(){
	var map= new ol.Map({
		target: 'map',
		layers: [],
		controls: [
		           new ol.control.Zoom()
		           ],
		           view: new ol.View({
		        	   center:[1545862.460039, 4598265.489834],
		        	   zoom: 5
		           })
	});
	return map;
});

geoM.factory('baseLayer', function() {
	// todo thr following configuration should be loaded from a rest service (from LayerCatalogue) 
	var baseLayersConf={
			"Default": {
				"OpenStreetMap": {
					"type": "TMS",
					"category":"Default",
					"label": "OpenStreetMap",
					"layerURL": "http://tile.openstreetmap.org/",
					"layerOptions": {
						"type": "png",
						"displayOutsideMaxExtent": true
					}
				},
				"OSM": {
					"type": "OSM",
					"category":"Default",
					"label":"OSM"
				}
			}
	};
	return baseLayersConf;
});

geoM.service('geoModule_layerServices', function(
		$http, baseLayer, sbiModule_logger, 
		$map, $http, geoModule_thematizer, geo_interaction, 
		crossNavigation, sbiModule_config, geoModule_template, sbiModule_restServices ) {

	var layerServ=this;

	this.selectedBaseLayer;  //the selected base layer
	this.selectedBaseLayerOBJ;
	this.loadedLayer={};
	this.loadedLayerOBJ={};
	this.templateLayer={};
	this.templateLayerData={};

	this.selectedFeatures = [];
//	
//	this.cachedFeatureStyles = {};

	this.setTemplateLayer = function(data){
		Object.assign(layerServ.templateLayerData,data);
		if(layerServ.templateLayerData.type=="WMS"){
			var sldBody=geoModule_thematizer.getWMSSlBody(layerServ.templateLayerData);
			console.log(sldBody)
			var params=JSON.parse(layerServ.templateLayerData.layerParams);
		params.LAYERS=layerServ.templateLayerData.layerName;
//			var params={};
			params.SLD_BODY =sldBody;
			
			layerServ.templateLayer = new ol.layer.Tile({
				source : new ol.source.TileWMS(/** @type {olx.source.TileWMSOptions} */
						{
							url : sbiModule_config.contextName+"/api/1.0/geo/getWMSlayer?layerURL="+layerServ.templateLayerData.layerURL,
							params : params,
							options :JSON.parse(layerServ.templateLayerData.layerOptions)
						})
			});

		}else{
			var vectorSource = new ol.source.Vector({
				features: (new ol.format.GeoJSON()).readFeatures(layerServ.templateLayerData, {
//					dataProjection: 'EPSG:4326',
					featureProjection: 'EPSG:3857'
				})
			});


			layerServ.templateLayer = new ol.layer.Vector({
				zIndex:2,
				source: vectorSource
				, style: geoModule_thematizer.getStyle
			});
		}

		layerServ.templateLayer.setZIndex(1000);
//		$map.addLayer(this.templateLayer);
		$map.addLayer(layerServ.templateLayer);
		var duration = 2000;
		var start = +new Date();
		var pan = ol.animation.pan({
			duration: duration,
			source: /** @type {ol.Coordinate} */ ($map.getView().getCenter())
		});
		var bounce = ol.animation.bounce({
			duration: duration,
			resolution: 4*$map.getView().getResolution()
		});

		$map.beforeRender(pan, bounce);

		$map.getView().setCenter(geoModule_template.currentView.center);
		$map.getView().setZoom(geoModule_template.currentView.zoom); 

//		$map.getView().fit(layerServ.templateLayer.getProperties().source.getExtent(),$map.getSize());

		layerServ.addClickEvent();
	};


	this.overlay;

	this.addClickEvent=function(){
		var selectStyle = new ol.style.Style({
			stroke: new ol.style.Stroke({
//				color: '#000000',
				color: [0, 0, 0, 1],
				width: 2
			}),
			fill: new ol.style.Fill({
				color: "rgba(174, 206, 230, 0.78)"
			})
		});
		
		layerServ.overlay = new ol.Overlay(/** @type {olx.OverlayOptions} */ ({
			element: angular.element((document.querySelector('#popup')))[0],
		}));
		$map.addOverlay(layerServ.overlay);

		var select = new ol.interaction.Select({
			condition: ol.events.condition.singleClick,
			style: selectStyle
		});
		$map.addInteraction(select);
		
		var sFeatures = select.getFeatures();
		
		select.on('select', function(evt) {
			console.log("select");
			if(geo_interaction.type == "identify" && (evt.selected[0]==undefined || geo_interaction.distance_calculator) && layerServ.templateLayerData.type!="WMS"){
				layerServ.overlay.setPosition(undefined);
				return;
			}

			//if is a WMS i must load the properties from server
			if(layerServ.templateLayerData.type=="WMS"){
				var urlInfo= layerServ.templateLayer.getSource().getGetFeatureInfoUrl(
						evt.mapBrowserEvent.coordinate, $map.getView().getResolution(), 'EPSG:3857',
						{'INFO_FORMAT': 'application/json'});
				$http.get( urlInfo ).success(
						function(data, status, headers, config) {
							sbiModule_logger.log("getGetFeatureInfoUrl caricati",data);
							if (data.hasOwnProperty("errors")) {
								sbiModule_logger.log("getGetFeatureInfoUrl non Ottenuti",data.errors);
							} else {
								if(data.features.length==0){
									layerServ.overlay.setPosition(undefined);
								}else{
									layerServ.doClickAction(evt,data.features[0].properties)
								}

							}
						}).error(function(data, status, headers, config) {
							sbiModule_logger.log("getGetFeatureInfoUrl non Ottenuti " , status);
						});

			}else{
				var prop = evt.selected.length ? evt.selected[0].getProperties(): null;
				layerServ.doClickAction(evt,prop)
			}
		});

		var dragBox = new ol.interaction.DragBox({
//			condition: ol.events.condition.shiftKeyOnly,
			condition: ol.events.condition.platformModifierKeyOnly,
			style: selectStyle
		});
		$map.addInteraction(dragBox);
		
		dragBox.on('boxend', function(e) {
			var selection = [];
			var extent = dragBox.getGeometry().getExtent();
			
			var vectorSource = layerServ.templateLayer.getSource();
			vectorSource.forEachFeatureIntersectingExtent(extent, function(feature) {
				sFeatures.push(feature);				
				selection.push(feature);
			});
			
			layerServ.selectedFeatures = selection;
			geo_interaction.setSelectedFeatures(layerServ.selectedFeatures);
			
			console.log("layerServ.selectedFeatures (dragBox)-> ", layerServ.selectedFeatures);
			console.log("geo_interaction.selectedFilterType -> ", geo_interaction.selectedFilterType);
		});

		// clear selection when drawing a new box and when clicking on the map
		dragBox.on('boxstart', function(e) {
			layerServ.overlay.setPosition(undefined);
			sFeatures.clear();
		});
	}

	this.doClickAction = function(evt, prop){
		layerServ.selectedFeatures = evt.target.getFeatures().getArray();
		geo_interaction.setSelectedFeatures(layerServ.selectedFeatures);
		console.log("layerServ.selectedFeatures (select)-> ", layerServ.selectedFeatures);
		console.log("geo_interaction.selectedFilterType -> ", geo_interaction.selectedFilterType);
		
		if(geo_interaction.type == "identify"){
			var coordinate = evt.mapBrowserEvent.coordinate;
			var hdms = ol.coordinate.toStringHDMS(ol.proj.transform(coordinate, 'EPSG:3857', 'EPSG:4326'));

			var txt="";
			for(var key in prop){
				if(key != "geometry"){
					txt += "<p>" + key + " : " + prop[key]+ "</p>";
				}
			}

			angular.element((document.querySelector('#popup-content')))[0].innerHTML =txt;
			$map.getOverlays().getArray()[0].setPosition(coordinate);

		}else if(geo_interaction.type == "cross"){
			layerServ.overlay.setPosition(undefined); // hides eventual messages present on the map

			var multiSelect = geoModule_template.crossnav && geoModule_template.crossnav.multiSelect? 
					geoModule_template.crossnav.multiSelect : null;
			switch (multiSelect) {
			case (multiSelect !== undefined && true):
				/* Cross navigation with multiple selected features is handled 
				 * in "geoCrossNavMultiselect" controller */
				break;
			default:
				if(prop != null) {
					crossNavigation.navigateTo(layerServ.selectedFeatures[0]);
				}
			break;
			}
		}
	}

	this.updateTemplateLayer = function(legendType){
		geoModule_thematizer.updateLegend(legendType);
		
		if(layerServ.templateLayerData.type=="WMS"){
			var sldBody=geoModule_thematizer.getWMSSlBody(layerServ.templateLayerData);
			console.log(sldBody)
			layerServ.templateLayer.getSource().updateParams({SLD_BODY:sldBody})
		}else{
			layerServ.templateLayer.changed();
		}
	};

	this.isSelectedBaseLayer = function(layer){
		return angular.equals(this.selectedBaseLayerOBJ, layer);
	};

	this.layerIsLoaded = function(layer){
		return (this.loadedLayerOBJ[layer.layerId]!=undefined);
	};

	this.alterBaseLayer = function(layerConf) {
		console.log("alterBaseLayer", layerConf);
		var layer = this.createLayer(layerConf,true);
		if(layer!=undefined){
			$map.removeLayer(this.selectedBaseLayer);
			this.selectedBaseLayer = layer;
			if(this.selectedBaseLayerOBJ==undefined){
				this.selectedBaseLayerOBJ = layerConf;
			}
			$map.addLayer(this.selectedBaseLayer);
			$map.render();
		}
	};

	this.toggleLayer = function(layerConf) {
		console.log("addLayer");
		if(this.loadedLayer[layerConf.layerId]!=undefined){
			$map.removeLayer(this.loadedLayer[layerConf.layerId]);
			delete this.loadedLayer[layerConf.layerId];
			delete this.loadedLayerOBJ[layerConf.layerId];
		}else{
			var layer = this.createLayer(layerConf,false);
			if(layer!=undefined){
				this.loadedLayer[layerConf.layerId]=layer;
				this.loadedLayerOBJ[layerConf.layerId]=layerConf;
				$map.addLayer(layer);
				$map.render();
			}
		}
	};

	this.createLayer = function(layerConf,isBase){
		var tmpLayer;

		switch (layerConf.type) {
		case 'WMS':
			tmpLayer = new ol.layer.Tile({
				source : new ol.source.TileWMS(/** @type {olx.source.TileWMSOptions} */
						({
							url : layerConf.layerURL,
							params : JSON.parse(layerConf.layerParams),
							options :JSON.parse(layerConf.layerOptions)
						}))
			});
			break;
			
		case 'WFS':
			var vectorSource = new ol.source.Vector({
				url: layerConf.layerURL,
				format: new ol.format.GeoJSON(),
//				options : JSON.parse(layerConf.layerOptions)
			});

			tmpLayer = new ol.layer.Vector({
				source: vectorSource,
			});
			break;

		case 'TMS': // TODO check if work
			var options=(layerConf.layerOptions instanceof Object)? layerConf.layerOptions : JSON.parse(layerConf.layerOptions);
			tmpLayer = new ol.layer.Tile({
				source : new ol.source.XYZ({
					tileUrlFunction : function(coordinate) {
						if (coordinate == null) {
							return "";
						}
						var z = coordinate[0];
						var x = coordinate[1];
						// var y = (1 << z) -coordinate[2] - 1;
						var y = -coordinate[2] - 1;
						return layerConf.layerURL + '' + z + '/' + x + '/' + y + '.'+ options.type;
					},

				})
			});
			break;
			
		case 'OSM':
			tmpLayer = new ol.layer.Tile({
				source : new ol.source.MapQuest({
					layer : 'osm'
				})
			});
			break;
			
		default:
			console.error('Layer type [' + layerConf.type + '] not supported');
			break;
		
		}

		if(isBase){
			tmpLayer.setZIndex(-1)
		}else{

		}

		return tmpLayer;
	};
});

geoM.factory('geoModule_constant',function(){
	var cont= {
			analysisLayer:"Analysis layer",
			templateLayer:"Document templates",
			noCategory:"No Category"
	}
	return cont;
});