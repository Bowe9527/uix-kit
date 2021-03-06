
/* 
 *************************************
 * <!-- Advanced Slider (Special Effects) -->
 *************************************
 */
APP = ( function ( APP, $, window, document ) {
    'use strict';
	

    APP.ADVANCED_SLIDER_FILTER               = APP.ADVANCED_SLIDER_FILTER || {};
	APP.ADVANCED_SLIDER_FILTER.version       = '0.0.2';
    APP.ADVANCED_SLIDER_FILTER.pageLoaded    = function() {

	
		var $window                   = $( window ),
			windowWidth               = $window.width(),
			windowHeight              = $window.height(),
			animDuration              = 600,
			$sliderWrapper            = $( '.custom-advanced-slider-sp' ),

			
			//Autoplay global variables
			timer                     = null,
			playTimes,
			
			
			//Basic webGL renderers 
			rendererOuterID           = 'custom-advanced-slider-sp-canvas-outer',
			rendererCanvasID          = 'custom-advanced-slider-sp-canvas',
			renderer,
		    
			//PIXI
			renderer_filter,
		    rendererCanvasID_filter   = rendererCanvasID,
		    stage_filter,
			items_container,
			displacementSprite,
			displacementFilter,
			
			//Three.js
			scenesAll                 = [],
			texturesAll               = [],
			webGLRenderer;
		
		
		
		sliderInit( false );
		
		$window.on( 'resize', function() {
			// Check window width has actually changed and it's not just iOS triggering a resize event on scroll
			if ( $window.width() != windowWidth ) {

				// Update the window width for next time
				windowWidth = $window.width();

				sliderInit( true );
				
			}
		});
		

		

		/*
		 * Initialize slideshow
		 *
		 * @param  {boolean} resize            - Determine whether the window size changes.
		 * @return {void}                   - The constructor.
		 */
        function sliderInit( resize ) {
	
			$sliderWrapper.each( function()  {

				var $this                    = $( this ),
					$items                   = $this.find( '.item' ),
					$first                   = $items.first(),
					nativeItemW,
					nativeItemH;
				
				

				//Initialize the first item container
				//-------------------------------------		
				$first.addClass( 'active' );

				if ( $first.find( 'video' ).length > 0 ) {

					//Returns the dimensions (intrinsic height and width ) of the video
					var video    = document.getElementById( $first.find( 'video' ).attr( 'id' ) ),
						videoURL = $first.find( 'source:first' ).attr( 'src' );

					video.addEventListener( 'loadedmetadata', function( e ) {
						$this.css( 'height', this.videoHeight*($this.width()/this.videoWidth) + 'px' );	

						nativeItemW = this.videoWidth;
						nativeItemH = this.videoHeight;	

						//Initialize all the items to the stage
						addItemsToStage( $this, $sliderWrapper, nativeItemW, nativeItemH );

					}, false);	

					video.src = videoURL;


				} else {

					var imgURL   = $first.find( 'img' ).attr( 'src' ),
						img      = new Image();

					img.onload = function() {
						$this.css( 'height', $this.width()*(this.height/this.width) + 'px' );		

						nativeItemW = this.width;
						nativeItemH = this.height;	

						//Initialize all the items to the stage
						addItemsToStage( $this, $sliderWrapper, nativeItemW, nativeItemH );

					};

					img.src = imgURL;

				}	
				
				
				

				//Autoplay Slider
				//-------------------------------------		
				if ( !resize ) {

					var dataAuto                 = $this.data( 'auto' ),
						dataTiming               = $this.data( 'timing' ),
						dataLoop                 = $this.data( 'loop' );

					if( typeof dataAuto === typeof undefined ) dataAuto = false;	
					if( typeof dataTiming === typeof undefined ) dataTiming = 10000;
					if( typeof dataLoop === typeof undefined ) dataLoop = false;


					if ( dataAuto && !isNaN( parseFloat( dataTiming ) ) && isFinite( dataTiming ) ) {

						sliderAutoPlay( dataTiming, $items, dataLoop );

						$this.on({
							mouseenter: function() {
								clearInterval( timer );
							},
							mouseleave: function() {
								sliderAutoPlay( dataTiming, $items, dataLoop );
							}
						});	

					}


				}

				
				

			});


		}
		
		

        /*
		 * Trigger slider autoplay
		 *
		 * @param  {number} timing           - Autoplay interval.
		 * @param  {object} items            - Each item in current slider.
		 * @param  {boolean} loop            - Determine whether to loop through each item.
		 * @return {void}                    - The constructor.
		 */
        function sliderAutoPlay( timing, items, loop ) {	
			
			var total = items.length;
			
			timer = setInterval( function() {

				playTimes = parseFloat( items.filter( '.active' ).index() );
				playTimes++;
				
			
				if ( !loop ) {
					if ( playTimes < total && playTimes >= 0 ) sliderUpdates( playTimes, $sliderWrapper );
				} else {
					if ( playTimes == total ) playTimes = 0;
					if ( playTimes < 0 ) playTimes = total-1;		
					sliderUpdates( playTimes, $sliderWrapper );
				}
				

				
			}, timing );	
		}

		
		
		/*
		 * Initialize all the items to the stage
		 *
		 * @param  {object} slider           - Current selector of each slider.
		 * @param  {object} sliderWrapper    - Wrapper of the slider.
		 * @param  {number} nativeItemW      - Returns the intrinsic width of the image/video.
		 * @param  {number} nativeItemH      - Returns the intrinsic height of the image/video.
		 * @return {void}                    - The constructor.
		 */
        function addItemsToStage( slider, sliderWrapper, nativeItemW, nativeItemH ) {
			
			var $this                    = slider,
				$items                   = $this.find( '.item' ),
				$first                   = $items.first(),
				itemsTotal               = $items.length,
				dataControlsPagination   = $this.data( 'controls-pagination' ),
				dataControlsArrows       = $this.data( 'controls-arrows' ),
				dataLoop                 = $this.data( 'loop' ),
				dataFilterTexture        = $this.data( 'filter-texture' );

	
			
			if( typeof dataControlsPagination === typeof undefined ) dataControlsPagination = '.custom-advanced-slider-sp-pagination';
			if( typeof dataControlsArrows === typeof undefined ) dataControlsArrows = '.custom-advanced-slider-sp-arrows';
			if( typeof dataLoop === typeof undefined ) dataLoop = false;
			if( typeof dataFilterTexture === typeof undefined ) dataFilterTexture = '';


				

		    //Prevent bubbling
			if ( itemsTotal == 1 ) {
				$( dataControlsPagination ).hide();
				$( dataControlsArrows ).hide();
			}

			if ( Modernizr.webgl ) {
				
				//Load slides to canvas
				//-------------------------------------	
				if ( $( '#' + rendererCanvasID ).length == 0 ) {
					$this.prepend( '<div id="'+rendererOuterID+'" class="custom-advanced-slider-sp-canvas-outer"><canvas id="'+rendererCanvasID+'"></canvas></div>' );
				}

				//Basic webGL renderers 
				//-------------------------------------
				renderer              = new PIXI.Application( $this.width(), $this.height(), {
														//backgroundColor : 0x000000, 
					                                    transparent     : true,
														autoResize      : true, 
														view            : document.getElementById( rendererCanvasID )
													});

				renderer_filter       = new PIXI.autoDetectRenderer( $this.width(), $this.height(), {
														//backgroundColor : 0x000000, 
														transparent     : true,
														view            : document.getElementById( rendererCanvasID_filter )
													});


				stage_filter          = new PIXI.Container();
				items_container       = new PIXI.Container();
				displacementSprite    = ( dataFilterTexture.indexOf( '.mp4' ) >= 0 ) ? new PIXI.Sprite( PIXI.Texture.fromVideo( dataFilterTexture ) ) : new PIXI.Sprite.fromImage( dataFilterTexture );
				displacementFilter    = new PIXI.filters.DisplacementFilter( displacementSprite );


				//----------------------------------------------------------------------------------
				//--------------------------------- Brightness Effect -------------------------------	
				//----------------------------------------------------------------------------------
				//Usage of returning sprite object: renderer.stage.children[index]
				if ( $this.hasClass( 'eff-brightness' ) ) {

					$this.find( '.item' ).each( function( index )  {

						var $thisItem = $( this );

						//Load sprite from each slider to canvas
						//-------------------------------------
						var curSprite;

						if ( $thisItem.find( 'video' ).length > 0 ) {


							// create a video texture from a path
							var videoURL = $thisItem.find( 'source:first' ).attr( 'src' ),
								texture  = PIXI.Texture.fromVideo( videoURL );

							curSprite = new PIXI.Sprite( texture );

							// pause the video
							var videoSource = texture.baseTexture.source;
							videoSource.autoplay = false;
							videoSource.pause();
							videoSource.currentTime = 0;
							videoSource.muted = true;

							//Returns the dimensions (intrinsic height and width ) of the video
							var video = document.getElementById( $thisItem.find( 'video' ).attr( 'id' ) );
							video.addEventListener( 'loadedmetadata', function( e ) {

								var	curW    = this.videoWidth,
									curH    = this.videoHeight,
									newW    = curW,
									newH    = curH;

								newW = $this.width();

								//Scaled/Proportional Content 
								newH = curH*(newW/curW);

								//At the same time change the height of the canvas
								renderer.view.style.width = newW + 'px';
								renderer.view.style.height = newH + 'px';	


							}, false);	

							video.src = videoURL;



						} else {

							var imgURL   = $thisItem.find( 'img' ).attr( 'src' ),
								imgCur   = new Image();

							curSprite = new PIXI.Sprite.fromImage( imgURL );

							imgCur.onload = function() {

								//At the same time change the height of the canvas
								renderer.view.style.width = $thisItem.find( 'img' ).width() + 'px';
								renderer.view.style.height = $thisItem.find( 'img' ).height() + 'px';


							};

							imgCur.src = imgURL;


						}

						curSprite.width  = $this.width();
						curSprite.height = $this.height();	


						// Render updated scene
						renderer.stage.addChild( curSprite );

						TweenMax.set( curSprite, {
							alpha : 0
						});	



					});



					//Initialize the default height of canvas
					//-------------------------------------	
					setTimeout( function() {
						canvasDefaultInit( $first );
					}, animDuration );



				}// end effect





				//----------------------------------------------------------------------------------
				//--------------------------------- Liquid Distortion Effect -----------------------
				//----------------------------------------------------------------------------------
				//Usage of returning sprite object: items_container.children[index]
				if ( $this.hasClass( 'eff-liquid' ) ) {

					$this.find( '.item' ).each( function( index )  {

						var $thisItem = $( this );



						//Load sprite from each slider to canvas
						//-------------------------------------
						var curSprite, 
							canvasRatio = $this.width()/nativeItemW;

						if ( $thisItem.find( 'video' ).length > 0 ) {


							// create a video texture from a path
							var videoURL = $thisItem.find( 'source:first' ).attr( 'src' ),
								texture  = PIXI.Texture.fromVideo( videoURL );

							curSprite = new PIXI.Sprite( texture );

							// pause the video
							var videoSource = texture.baseTexture.source;
							videoSource.autoplay = false;
							videoSource.pause();
							videoSource.currentTime = 0;
							videoSource.muted = true;


							//Returns the dimensions (intrinsic height and width ) of the video
							var video = document.getElementById( $thisItem.find( 'video' ).attr( 'id' ) );
							video.addEventListener( 'loadedmetadata', function( e ) {

								var	curW    = this.videoWidth,
									curH    = this.videoHeight,
									newW    = curW,
									newH    = curH;

								newW = $this.width();

								//Scaled/Proportional Content 
								newH = curH*(newW/curW);

								//At the same time change the height of the canvas
								renderer.view.style.width = newW + 'px';
								renderer.view.style.height = newH + 'px';	


							}, false);	

							video.src = videoURL;



						} else {

							var imgURL   = $thisItem.find( 'img' ).attr( 'src' ),
								imgCur   = new Image();

							curSprite = new PIXI.Sprite.fromImage( imgURL );

							imgCur.onload = function() {

								//At the same time change the height of the canvas
								renderer.view.style.width = $thisItem.find( 'img' ).width() + 'px';
								renderer.view.style.height =$thisItem.find( 'img' ).height() + 'px';

							};

							imgCur.src = imgURL;


						}

						curSprite.width  = $this.width();
						curSprite.height = $this.height();	


						//Need to scale according to the screen
						curSprite.scale.set( canvasRatio );

						TweenMax.set( curSprite, {
							alpha : 0
						});	


						items_container.addChild( curSprite );
						// Enable interactions
						items_container.interactive = true;


						//Add child container to the main container 
						//-------------------------------------
						stage_filter.addChild( items_container );
						// Enable Interactions
						stage_filter.interactive = true;

						//A texture stores the information that represents an image
						displacementSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;


						//Set the filter to stage and set some default values for the animation
						//-------------------------------------
						stage_filter.filters = [ displacementFilter ];    


						//Add filter container to the main container
						//-------------------------------------				
						displacementSprite.anchor.set( 0.5 );
						displacementSprite.x = renderer_filter.width / 2;
						displacementSprite.y = renderer_filter.height / 2; 

						displacementSprite.scale.x = 1;
						displacementSprite.scale.y = 1;

						// PIXI tries to fit the filter bounding box to the renderer so we optionally bypass
						displacementFilter.autoFit = false;

						stage_filter.addChild( displacementSprite );

						//Animation Effects
						//-------------------------------------
						var ticker       = new PIXI.ticker.Ticker();
						ticker.autoStart = true;
						ticker.add( function( delta ) {

	//								displacementSprite.x += 12.14 * delta;
	//								displacementSprite.y += 42.24 * delta;
	//
	//								displacementSprite.scale.x += 0.2 * delta;
	//								displacementSprite.scale.y += 0.2 * delta;

							// Render updated scene
							renderer_filter.render( stage_filter );

						});


					});

					//Initialize the default height of canvas
					//-------------------------------------	
					setTimeout( function() {
						canvasDefaultInit( $first );
					}, animDuration );


				}// end effect



				//----------------------------------------------------------------------------------
				//--------------------------------- Liquid Distortion Effect 2 -----------------------
				//----------------------------------------------------------------------------------
				//Usage of returning sprite object: items_container.children[index]
				if ( $this.hasClass( 'eff-liquid2' ) ) {

					$this.find( '.item' ).each( function( index )  {

						var $thisItem = $( this );



						//Load sprite from each slider to canvas
						//-------------------------------------
						var curSprite, 
							canvasRatio = $this.width()/nativeItemW;

						if ( $thisItem.find( 'video' ).length > 0 ) {


							// create a video texture from a path
							var videoURL = $thisItem.find( 'source:first' ).attr( 'src' ),
								texture  = PIXI.Texture.fromVideo( videoURL );

							curSprite = new PIXI.Sprite( texture );

							// pause the video
							var videoSource = texture.baseTexture.source;
							videoSource.autoplay = false;
							videoSource.pause();
							videoSource.currentTime = 0;
							videoSource.muted = true;


							//Returns the dimensions (intrinsic height and width ) of the video
							var video = document.getElementById( $thisItem.find( 'video' ).attr( 'id' ) );
							video.addEventListener( 'loadedmetadata', function( e ) {

								var	curW    = this.videoWidth,
									curH    = this.videoHeight,
									newW    = curW,
									newH    = curH;

								newW = $this.width();

								//Scaled/Proportional Content 
								newH = curH*(newW/curW);

								//At the same time change the height of the canvas
								renderer.view.style.width = newW + 'px';
								renderer.view.style.height = newH + 'px';	


							}, false);	

							video.src = videoURL;



						} else {

							var imgURL   = $thisItem.find( 'img' ).attr( 'src' ),
								imgCur   = new Image();

							curSprite = new PIXI.Sprite.fromImage( imgURL );

							imgCur.onload = function() {

								//At the same time change the height of the canvas
								renderer.view.style.width = $thisItem.find( 'img' ).width() + 'px';
								renderer.view.style.height =$thisItem.find( 'img' ).height() + 'px';

							};

							imgCur.src = imgURL;


						}

						curSprite.width  = $this.width();
						curSprite.height = $this.height();	


						//Need to scale according to the screen
						curSprite.scale.set( canvasRatio );

						TweenMax.set( curSprite, {
							alpha : 0
						});	


						items_container.addChild( curSprite );
						// Enable interactions
						items_container.interactive = true;


						//Add child container to the main container 
						//-------------------------------------
						stage_filter.addChild( items_container );
						// Enable Interactions
						stage_filter.interactive = true;

						//A texture stores the information that represents an image
						displacementSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
						


						//Set the filter to stage and set some default values for the animation
						//-------------------------------------
						stage_filter.filters = [ displacementFilter ];    


						//Add filter container to the main container
						//-------------------------------------				
						displacementSprite.anchor.set( 0.5 );
						displacementSprite.x = renderer_filter.width / 2;
						displacementSprite.y = renderer_filter.height / 2;
					


						// PIXI tries to fit the filter bounding box to the renderer so we optionally bypass
						displacementFilter.autoFit = false;

						stage_filter.addChild( displacementSprite );

						//Animation Effects
						//-------------------------------------
						var ticker       = new PIXI.ticker.Ticker();
						ticker.autoStart = true;
						ticker.add( function( delta ) {
							
          
							// Render updated scene
							renderer_filter.render( stage_filter );

						});


					});

					//Initialize the default height of canvas
					//-------------------------------------	
					setTimeout( function() {
						canvasDefaultInit( $first );
					}, animDuration );


				}// end effect
		
				
				//----------------------------------------------------------------------------------
				//--------------------------------- Liquid Distortion Effect 3 -----------------------
				//----------------------------------------------------------------------------------
				//Usage of returning sprite object: items_container.children[index]
				if ( $this.hasClass( 'eff-liquid3' ) ) {

					$this.find( '.item' ).each( function( index )  {

						var $thisItem = $( this );



						//Load sprite from each slider to canvas
						//-------------------------------------
						var curSprite, 
							canvasRatio = $this.width()/nativeItemW;

						if ( $thisItem.find( 'video' ).length > 0 ) {


							// create a video texture from a path
							var videoURL = $thisItem.find( 'source:first' ).attr( 'src' ),
								texture  = PIXI.Texture.fromVideo( videoURL );

							curSprite = new PIXI.Sprite( texture );

							// pause the video
							var videoSource = texture.baseTexture.source;
							videoSource.autoplay = false;
							videoSource.pause();
							videoSource.currentTime = 0;
							videoSource.muted = true;


							//Returns the dimensions (intrinsic height and width ) of the video
							var video = document.getElementById( $thisItem.find( 'video' ).attr( 'id' ) );
							video.addEventListener( 'loadedmetadata', function( e ) {

								var	curW    = this.videoWidth,
									curH    = this.videoHeight,
									newW    = curW,
									newH    = curH;

								newW = $this.width();

								//Scaled/Proportional Content 
								newH = curH*(newW/curW);

								//At the same time change the height of the canvas
								renderer.view.style.width = newW + 'px';
								renderer.view.style.height = newH + 'px';	


							}, false);	

							video.src = videoURL;



						} else {

							var imgURL   = $thisItem.find( 'img' ).attr( 'src' ),
								imgCur   = new Image();

							curSprite = new PIXI.Sprite.fromImage( imgURL );

							imgCur.onload = function() {

								//At the same time change the height of the canvas
								renderer.view.style.width = $thisItem.find( 'img' ).width() + 'px';
								renderer.view.style.height =$thisItem.find( 'img' ).height() + 'px';

							};

							imgCur.src = imgURL;


						}

						curSprite.width  = $this.width();
						curSprite.height = $this.height();	


						//Need to scale according to the screen
						curSprite.scale.set( canvasRatio );

						TweenMax.set( curSprite, {
							alpha : 0
						});	


						items_container.addChild( curSprite );
						// Enable interactions
						items_container.interactive = true;


						//Add child container to the main container 
						//-------------------------------------
						stage_filter.addChild( items_container );
						// Enable Interactions
						stage_filter.interactive = true;

						//A texture stores the information that represents an image
						displacementSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
						


						//Set the filter to stage and set some default values for the animation
						//-------------------------------------
						stage_filter.filters = [ displacementFilter ];    


						//Add filter container to the main container
						//-------------------------------------				
						displacementSprite.anchor.set( 0.5 );
						displacementSprite.x = renderer_filter.width / 2;
						displacementSprite.y = renderer_filter.height / 2;
					


						// PIXI tries to fit the filter bounding box to the renderer so we optionally bypass
						displacementFilter.autoFit = false;

						stage_filter.addChild( displacementSprite );

						//Animation Effects
						//-------------------------------------
						var ticker       = new PIXI.ticker.Ticker();
						ticker.autoStart = true;
						ticker.add( function( delta ) {
							
                            //Need the displacementSprite.texture.baseTexture.wrapMode is "PIXI.WRAP_MODES.REPEAT"
							displacementSprite.x += 1 * delta;
							displacementSprite.y += 0.3;
							
							// Render updated scene
							renderer_filter.render( stage_filter );

						});


					});

					//Initialize the default height of canvas
					//-------------------------------------	
					setTimeout( function() {
						canvasDefaultInit( $first );
					}, animDuration );


				}// end effect
				

				//----------------------------------------------------------------------------------
				//--------------------------------- 3D Rotating Effect -----------------------------
				//----------------------------------------------------------------------------------
				//Usage of returning sprite object: texturesAll[ index ]     scenesAll[ index ]
				if ( $this.hasClass( 'eff-3d-rotating' ) ) {


					var texture;

					//Drag and Drop
					var targetRotationX             = 0,
						targetRotationXOnMouseDown  = 0,
						targetRotationXOnTouchDown  = 0,
						targetRotationY             = 0,
						targetRotationYOnMouseDown  = 0,
						targetRotationYOnTouchDown  = 0,
						mouseX                      = 0,
						mouseY                      = 0,
						mouseXOnMouseDown           = 0,
						mouseXOnTouchDown           = 0,
						mouseYOnMouseDown           = 0,
						mouseYOnTouchDown           = 0,
						windowHalfX                 = $this.width() / 2,
						windowHalfY                 = $this.height() / 2;



					//Add Geometries and Lights to the main container 
					//-------------------------------------					
					var init = function() {
						$this.find( '.item' ).each( function( index )  {

							var $thisItem = $( this );

							// create a scene, that will hold all our elements such as objects, cameras and lights.
							var scene  = new THREE.Scene();
							scene.name = 'scene-' + index;


							// make a list item
							var element = document.createElement( 'div' );
							element.className = 'list-item';
							element.innerHTML = '<div class="scene" style="width:'+$this.width() +'px;height:'+$this.height() +'px;"></div>';

							// Look up the element that represents the area
							// we want to render the scene
							scene.userData.element = element.querySelector( '.scene' );
							document.getElementById( rendererOuterID ).appendChild( element );

							TweenMax.set( $( '#' + rendererOuterID ).find( '.list-item' ), {
									alpha: 0,
									css  : {
										display: 'none'
									}
								});	


							// Create a camera, which defines where we're looking at.
							var aspect      = $this.width() / $this.height(),
								camera      = new THREE.PerspectiveCamera( 55, aspect, 0.1, 1000 );

							camera.position.x = 0;
							camera.position.y = -30;
							camera.position.z = 25;
							camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
							scene.userData.camera = camera;


							// Generate one plane geometries mesh to each scene
							if ( $thisItem.find( 'video' ).length > 0 ) {


								texture = new THREE.VideoTexture( document.getElementById( $thisItem.find( 'video' ).attr( 'id' ) ) );
								texture.minFilter = THREE.LinearFilter;
								texture.magFilter = THREE.LinearFilter;
								texture.format = THREE.RGBFormat;

								// pause the video
								texture.image.autoplay = true;
								texture.image.currentTime = 0;
								texture.image.muted = false;
								texture.image.pause();



							} else {
								texture = new THREE.TextureLoader().load( $thisItem.find( 'img' ).attr( 'src' ) );
								texture.generateMipmaps = false;
								texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
								texture.minFilter = THREE.LinearFilter;
							}

							// texture controller
							texturesAll.push( texture );




							// Immediately use the texture for material creation
							var spriteMat            = new THREE.MeshPhongMaterial( { map: texture } ),
								imgRatio             = $this.width() / $this.height(),
								geometry             = new THREE.BoxGeometry( imgRatio*15, 15, 2 ),
								displacementSprite   = new THREE.Mesh( geometry, spriteMat );

							displacementSprite.position.set( -0.01, -0.01, 0 );
							displacementSprite.rotation.set( 0, 0, 0 );
							scene.add( displacementSprite );


							// Generate Ambient Light
							var ambiLight = new THREE.AmbientLight( 0x404040 );
							scene.add( ambiLight );

							// Generate Directional Light
							var light = new THREE.DirectionalLight( 0xffffff, 0.5 );
							light.position.set( 0, 30, 70 );
							scene.add( light );


							// Display multiple instances of three.js in a single page
							scenesAll.push( scene );



						});


						//Create a render and set the size
						webGLRenderer = new THREE.WebGLRenderer( { 
												canvas   : document.getElementById( rendererCanvasID ), //canvas
												alpha    : true, 
												antialias: true 
											} );

						webGLRenderer.setClearColor( new THREE.Color( 0x000000, 0 ) );
						webGLRenderer.setPixelRatio( window.devicePixelRatio );  
						webGLRenderer.shadowMap.enabled = true;


					};

					//Add render event
					//-------------------------------------	

					//Converts numeric degrees to radians
					var toRad = function( number ) {
						return number * Math.PI / 180;
					};


					var render = function() {


						webGLRenderer.setClearColor( 0x000000 );
						webGLRenderer.setScissorTest( false );
						webGLRenderer.clear();

						webGLRenderer.setClearColor( 0x000000 );
						webGLRenderer.setScissorTest( true );

						scenesAll.forEach( function( scene, i ) {

							// Get the element that is a place holder for where we want to draw the scene
							var element = scene.userData.element,
								camera  = scene.userData.camera,
								rect    = element.getBoundingClientRect();


							//automatic rotation
							scene.children[0].rotation.y = Date.now() * 0.0001;
							var amplitudeVal = 1.0 + Math.sin( Date.now() * 0.0001 * 0.5 );

							
							//drag & drop
	//						scene.children[0].rotation.x = toRad( targetRotationX * 4 );
	//						scene.children[0].rotation.y = toRad( targetRotationY * 4 );	
	//						
							//drag & drop with easing effect
							scene.children[0].rotation.x += ( targetRotationX - scene.children[0].rotation.x ) * 0.05;
							scene.children[0].rotation.y += ( targetRotationY - scene.children[0].rotation.y ) * 0.05;


							// set the viewport
							webGLRenderer.setViewport( 0, 0, rect.width, rect.height );
							webGLRenderer.setScissor( 0, 0, rect.width, rect.height );


							//tell texture object it needs to be updated
							texture.needsUpdate = true;

							camera.aspect = $this.width() / $this.height(); // not changing in this example
							camera.updateProjectionMatrix();

							//drag & drop
							webGLRenderer.render( scene, camera );

						} );

					};



					//Animation Interactions
					//-------------------------------------
					var animate = function() {
						render();
						requestAnimationFrame( animate );
					};


					init();
					animate();


					//Rotation and Drop

					var onDocumentMouseDown = function( e ) {
						e.preventDefault();
						document.addEventListener( 'mousemove', onDocumentMouseMove, false );
						document.addEventListener( 'mouseup', onDocumentMouseUp, false );
						document.addEventListener( 'mouseout', onDocumentMouseOut, false );
						mouseXOnMouseDown = e.clientX - windowHalfX;
						mouseYOnMouseDown = e.clientY - windowHalfY;
						targetRotationXOnMouseDown = targetRotationX;
						targetRotationYOnMouseDown = targetRotationY;
					};

					var onDocumentMouseMove = function( e ) {
						mouseX = e.clientX - windowHalfX;
						mouseY = e.clientY - windowHalfY;
						targetRotationX = targetRotationXOnMouseDown + (mouseX - mouseXOnMouseDown) * 0.02;
						targetRotationY = targetRotationYOnMouseDown + (mouseY - mouseYOnMouseDown) * 0.02;
					};

					var onDocumentMouseUp = function( e ) {
						document.removeEventListener( 'mousemove', onDocumentMouseMove, false );
						document.removeEventListener( 'mouseup', onDocumentMouseUp, false );
						document.removeEventListener( 'mouseout', onDocumentMouseOut, false );

					};

					var onDocumentMouseOut = function( e ) {
						document.removeEventListener( 'mousemove', onDocumentMouseMove, false );
						document.removeEventListener( 'mouseup', onDocumentMouseUp, false );
						document.removeEventListener( 'mouseout', onDocumentMouseOut, false );

					};




					var onDocumentTouchStart = function( e ) {
						e.preventDefault();
						e = e.changedTouches[ 0 ];

						document.addEventListener( 'touchmove', onDocumentTouchMove, false );
						document.addEventListener( 'touchend', onDocumentTouchEnd, false );
						mouseXOnTouchDown = e.clientX - windowHalfX;
						mouseYOnTouchDown = e.clientY - windowHalfY;
						targetRotationXOnTouchDown = targetRotationX;
						targetRotationYOnTouchDown = targetRotationY;


					};

					var onDocumentTouchMove = function( e ) {
						e.preventDefault();
						e = e.changedTouches[ 0 ];

						mouseX = e.clientX - windowHalfX;
						mouseY = e.clientY - windowHalfY;
						targetRotationX = targetRotationXOnTouchDown + (mouseX - mouseXOnTouchDown) * 0.02;
						targetRotationY = targetRotationYOnTouchDown + (mouseY - mouseYOnTouchDown) * 0.02;	



					};

					var onDocumentTouchEnd = function( e ) {
						document.removeEventListener( 'touchmove', onDocumentTouchMove, false );
						document.removeEventListener( 'touchend', onDocumentTouchEnd, false );

					};

					if ( Modernizr.touchevents ) {
						document.addEventListener( 'touchstart', onDocumentTouchStart, false );
					} else {
						document.addEventListener( 'mousedown', onDocumentMouseDown, false );
					}




					//Responsive plane geometries
					//-------------------------------------
					window.addEventListener( 'resize', function () {

						var width = document.getElementById( rendererCanvasID ).clientWidth;
						var height = document.getElementById( rendererCanvasID ).clientHeight;

						if ( document.getElementById( rendererCanvasID ).width !== width || document.getElementById( rendererCanvasID ).height !== height ) {

							webGLRenderer.setSize( width, height, false );

						}


					}, false );


					//Initialize the default height of canvas
					//-------------------------------------	
					setTimeout( function() {
						canvasDefaultInit( $first );
					}, animDuration );


				}// end effect


				//Canvas Interactions
				//-------------------------------------
				transitionInteractions( 0, $this, 'in' );
				
				
			}
			

			// Fires local videos asynchronously with slider switch.
			//-------------------------------------
			if ( !Modernizr.webgl ) normalSliderVideoInit( $items, false );	



			//Pagination dots 
			//-------------------------------------	
			var _dot       = '',
				_dotActive = '';
			_dot += '<ul>';
			for ( var i = 0; i < itemsTotal; i++ ) {

				_dotActive = ( i == 0 ) ? 'class="active"' : '';

				_dot += '<li><a '+_dotActive+' data-index="'+i+'" href="javascript:"></a></li>';
			}
			_dot += '</ul>';

			if ( $( dataControlsPagination ).html() == '' ) $( dataControlsPagination ).html( _dot );

			$( dataControlsPagination ).find( 'li a' ).on( 'click', function( e ) {
				e.preventDefault();

				if ( !$( this ).hasClass( 'active' ) ) {
					
					//Canvas Interactions
					transitionInteractions( $items.filter( '.active' ).index(), sliderWrapper, 'out' );
					
					//Update the current and previous/next items
					sliderUpdates( $( this ).attr( 'data-index' ), sliderWrapper );

					//Pause the auto play event
					clearInterval( timer );	
				}



			});

			//Next/Prev buttons
			//-------------------------------------		
			var _prev = $( dataControlsArrows ).find( '.prev' ),
				_next = $( dataControlsArrows ).find( '.next' );

			$( dataControlsArrows ).find( 'a' ).attr( 'href', 'javascript:' );

			$( dataControlsArrows ).find( 'a' ).removeClass( 'disabled' );
			if ( !dataLoop ) {
				_prev.addClass( 'disabled' );
			}



			_prev.on( 'click', function( e ) {
				e.preventDefault();

				//Canvas Interactions
				transitionInteractions( $items.filter( '.active' ).index(), sliderWrapper, 'out' );	

				//Update the current and previous items
				sliderUpdates( parseFloat( $items.filter( '.active' ).index() ) - 1, sliderWrapper );

				//Pause the auto play event
				clearInterval( timer );

			});

			_next.on( 'click', function( e ) {
				e.preventDefault();

				//Canvas Interactions
				transitionInteractions( $items.filter( '.active' ).index(), sliderWrapper, 'out' );	

				//Update the current and next items
				sliderUpdates( parseFloat( $items.filter( '.active' ).index() ) + 1, sliderWrapper );


				//Pause the auto play event
				clearInterval( timer );


			});



			//Added touch method to mobile device
			//-------------------------------------	
			var startX,
				startY;


			$this.on( 'touchstart.advancedSlider', function( event ) {
				var touches = event.originalEvent.touches;
				if ( touches && touches.length ) {
					startX = touches[0].pageX;
					startY = touches[0].pageY;


					$this.on( 'touchmove.advancedSlider', function( event ) {

						var touches = event.originalEvent.touches;
						if ( touches && touches.length ) {
							var deltaX = startX - touches[0].pageX,
								deltaY = startY - touches[0].pageY;

							if ( deltaX >= 50) {
								//--- swipe left


								sliderUpdates( parseFloat( $items.filter( '.active' ).index() ) + 1, sliderWrapper );


								//Pause the auto play event
								clearInterval( timer );

							}
							if ( deltaX <= -50) {
								//--- swipe right

								sliderUpdates( parseFloat( $items.filter( '.active' ).index() ) - 1, sliderWrapper );


								//Pause the auto play event
								clearInterval( timer );							


							}
							if ( deltaY >= 50) {
								//--- swipe up


							}
							if ( deltaY <= -50) {
								//--- swipe down

							}
							if ( Math.abs( deltaX ) >= 50 || Math.abs( deltaY ) >= 50 ) {
								$this.off( 'touchmove.advancedSlider' );
							}
						}

					});
				}	
			});
			

		}
		
		
	
		/*
		 * Transition Between Slides
		 *
		 * @param  {number} elementIndex     - Index of current slider.
		 * @param  {object} slider           - Selector of the slider .
		 * @return {void}                    - The constructor.
		 */
        function sliderUpdates( elementIndex, slider ) {
			
			var $items                   = slider.find( '.item' ),
				$current                 = $items.eq( elementIndex ),
			    total                    = $items.length,
				dataCountTotal           = slider.data( 'count-total' ),
				dataCountCur             = slider.data( 'count-now' ),
				dataControlsPagination   = slider.data( 'controls-pagination' ),
				dataControlsArrows       = slider.data( 'controls-arrows' ),	
				dataLoop                 = slider.data( 'loop' );
			

			if( typeof dataCountTotal === typeof undefined ) dataCountTotal = 'p.count em.count';
			if( typeof dataCountCur === typeof undefined ) dataCountCur = 'p.count em.current';
			if( typeof dataControlsPagination === typeof undefined ) dataControlsPagination = '.custom-advanced-slider-sp-pagination';
			if( typeof dataControlsArrows === typeof undefined ) dataControlsArrows = '.custom-advanced-slider-sp-arrows';
			if( typeof dataLoop === typeof undefined ) dataLoop = false;			
		
		    //Prevent bubbling
			if ( total == 1 ) {
				$( dataControlsPagination ).hide();
				$( dataControlsArrows ).hide();
				return false;
			}
	
			
			
			//Transition Interception
			//-------------------------------------
			if ( dataLoop ) {
				if ( elementIndex == total ) elementIndex = 0;
				if ( elementIndex < 0 ) elementIndex = total-1;	
			} else {
				$( dataControlsArrows ).find( 'a' ).removeClass( 'disabled' );
				if ( elementIndex == total - 1 ) $( dataControlsArrows ).find( '.next' ).addClass( 'disabled' );
				if ( elementIndex == 0 ) $( dataControlsArrows ).find( '.prev' ).addClass( 'disabled' );
			}

			// To determine if it is a touch screen.
			if ( Modernizr.touchevents ) {
				if ( elementIndex == total ) elementIndex = total-1;
				if ( elementIndex < 0 ) elementIndex = 0;	
				
				//Prevent bubbling
				if ( !dataLoop ) {
					//first item
					if ( elementIndex == 0 ) {
						$( dataControlsArrows ).find( '.prev' ).addClass( 'disabled' );
					}

					//last item
					if ( elementIndex == total - 1 ) {
						$( dataControlsArrows ).find( '.next' ).addClass( 'disabled' );
					}	
				}

				
			}

			$( dataControlsPagination ).find( 'li a' ).removeClass( 'leave' );
			$( dataControlsPagination ).find( 'li a.active' ).removeClass( 'active' ).addClass( 'leave' );
			$( dataControlsPagination ).find( 'li a[data-index="'+elementIndex+'"]' ).addClass( 'active' ).removeClass( 'leave' );
			
			
			$items.removeClass( 'leave' );
			slider.find( '.item.active' ).removeClass( 'active' ).addClass( 'leave' );
			$items.eq( elementIndex ).addClass( 'active' ).removeClass( 'leave' );

			
			

			//Display counter
			//-------------------------------------
			$( dataCountTotal ).text( total );
			$( dataCountCur ).text( parseFloat( elementIndex ) + 1 );		
			

			// Fires local videos asynchronously with slider switch.
			//-------------------------------------
			if ( !Modernizr.webgl ) {
				normalSliderVideoInit( $items, false );
				normalSliderVideoInit( $current, true );	
			}
			
			//Reset the default height of canvas
			//-------------------------------------	
			setTimeout( function() {
				canvasDefaultInit( $current );
			}, animDuration );
			
			//Canvas Interactions
			//-------------------------------------
			transitionInteractions( elementIndex, slider, 'in' );
			

			
		}
		
	

		

		/*
		 * Initialize the default height of canvas
		 *
		 * @param  {object} slider           - Current selector of each slider.
		 * @return {void}                    - The constructor.
		 */
        function canvasDefaultInit( slider ) {
			
			if ( slider.find( 'video' ).length > 0 ) {

				//Returns the dimensions (intrinsic height and width ) of the video
				var video    = document.getElementById( slider.find( 'video' ).attr( 'id' ) ),
					videoURL = slider.find( 'source:first' ).attr( 'src' );

				video.addEventListener( 'loadedmetadata', function( e ) {

					//At the same time change the height of the canvas and slider container
					var h = this.videoHeight*(slider.closest( '.custom-advanced-slider-outer' ).width()/this.videoWidth);
					
					if ( Modernizr.webgl ) {
						renderer.view.style.height = h + 'px';
					}
					
					//---
					$sliderWrapper.css( 'height', h + 'px' );	

				}, false);	

				video.src = videoURL;


			} else {

				var imgURL   = slider.find( 'img' ).attr( 'src' ),
					img      = new Image();
				

				img.onload = function() {

					if ( Modernizr.webgl ) {
					    renderer.view.style.height = slider.find( 'img' ).height() + 'px';		
					}
					//---
					$sliderWrapper.css( 'height', slider.closest( '.custom-advanced-slider-outer' ).width()*(this.height/this.width) + 'px' );		

				};

				img.src = imgURL;

			}	
			


		}
		
		
		
		/*
		 * Canvas Transition Interactions
		 * @http://pixijs.download/dev/docs/index.html
		 *
		 * @param  {number} elementIndex     - Index of current slider.
		 * @param  {object} slider           - Selector of the slider.
		 * @param  {string} goType           - The type of entry and exit between two items.  
		                                       Optional values: in, out
		 * @return {void}                    - The constructor.
		 */
        function transitionInteractions( elementIndex, slider, goType ) {
			
			if ( Modernizr.webgl ) {
			
				var $myRenderer           = $( '#' + rendererOuterID ),
				    $current              = slider.find( '.item' ).eq( elementIndex ),
					imgSel                = $current.find( 'img' ),
				    curImgURL             = imgSel.attr( 'src' ),
					stageW                = slider.width(),
					stageH                = slider.height(),
					spTotal               = slider.find( '.item' ).length;
				
				
				//----------------------------------------------------------------------------------
				//--------------------------------- Brightness Effect -------------------------------	
				//----------------------------------------------------------------------------------
				if ( slider.hasClass( 'eff-brightness' ) ) {
				
			
					//Display wrapper of canvas (transitions between slides)
					//-------------------------------------	
					if ( goType == 'out' ) {
						//Current item leaving action
						
						TweenMax.to( renderer.stage.children[ elementIndex ], 1, {
							pixi: {
								brightness: 5
							},
							alpha : 1
						});	
						
					} else {
						//Current item entry action
						
						TweenMax.to( $myRenderer, animDuration/1000, {
							alpha : 0,
							onComplete    : function() {

								var curSp = renderer.stage.children[ elementIndex ];

								TweenMax.to( this.target, animDuration/1000, {
									alpha : 1
								});			


								//display the current item
								for ( var k = 0; k < spTotal; k++ ) {

									var obj = renderer.stage.children[ k ];
									TweenMax.set( obj, {
										alpha : 0
									});	

									//pause all videos
									if ( obj._texture.baseTexture.imageType == null ) {
										var videoSource = obj.texture.baseTexture.source;

										// play the video
										videoSource.currentTime = 0;
										videoSource.autoplay = false;
										videoSource.pause();
										videoSource.muted = true;
									}		

								}



								//play current video
								if ( curSp._texture.baseTexture.imageType == null ) {
									var videoSource2 = curSp.texture.baseTexture.source;

									// play the video
									videoSource2.currentTime = 0;
									videoSource2.autoplay = true;
									videoSource2.play();
									videoSource2.muted = false;
								}


								//display filters
								TweenMax.set( curSp, {
									pixi: {
										brightness: 5
									},
									alpha : 1,
									onComplete    : function() {
										TweenMax.to( this.target, animDuration/1000, {
											pixi: {
												brightness: 1
											}
										});				
									}
								});		
	



							}
						});			
					}
					
					

	


				} // end effect


				
				

				//----------------------------------------------------------------------------------
				//--------------------------------- Liquid Distortion Effect -----------------------
				//----------------------------------------------------------------------------------
				if ( slider.hasClass( 'eff-liquid' ) ) {
					
				
					
					//Display wrapper of canvas (transitions between slides)
					//-------------------------------------	
					if ( goType == 'out' ) {
						//Current item leaving action
						
						TweenMax.to( displacementSprite.scale, 1, { 
							x: 10,
							y: 10
						} );

						
					} else {
						//Current item entry action
						
						TweenMax.to( $myRenderer, animDuration/1000, {
							alpha : 0,
							onComplete    : function() {

								var curSp = items_container.children[ elementIndex ];

								TweenMax.to( this.target, animDuration/1000, {
									alpha : 1
								});	


								//display the current item
								for ( var k = 0; k < spTotal; k++ ) {

									var obj = items_container.children[ k ];
									TweenMax.set( obj, {
										alpha : 0
									});	

									//pause all videos
									if ( obj._texture.baseTexture.imageType == null ) {
										var videoSource = obj.texture.baseTexture.source;

										// play the video
										videoSource.currentTime = 0;
										videoSource.autoplay = false;
										videoSource.pause();
										videoSource.muted = true;
									}		

								}



								//play current video
								if ( curSp._texture.baseTexture.imageType == null ) {
									var videoSource2 = curSp.texture.baseTexture.source;

									// play the video
									videoSource2.currentTime = 0;
									videoSource2.autoplay = true;
									videoSource2.play();
									videoSource2.muted = false;
								}


								//display filters
								TweenMax.set( curSp, {
									alpha : 1
								});	

								displacementSprite.scale.set( 10, 10 );
								var baseTimeline = TweenMax.to( displacementSprite.scale, 2, { 
									x: 0,
									y: 0,
									onComplete: function() {


									},
									onUpdate: function() {
										//console.log( baseTimeline.progress() );

									}
								} );





							}
						});		



						//Add new ripple each time mouse is clicked
						//-------------------------------------
						// @https://pixijs.download/v4.5.4/docs/PIXI.interaction.InteractionManager.html
						var rafID, mouseX, mouseY;

						stage_filter.pointerup = function( mouseData ) {
							TweenMax.to( displacementSprite.scale, 1, { x: 0, y: 0 } );
							cancelAnimationFrame( rafID );               

						};

						stage_filter.pointerdown = function( mouseData ) {
							mouseX = mouseData.data.global.x;
							mouseY = mouseData.data.global.y;   
							TweenMax.to( displacementSprite.scale, 1, { x: "+=" + Math.sin( mouseX ) * 100 + "", y: "+=" + Math.cos( mouseY ) * 100 + ""  });   
							rotateSpite();	

						};     

						var rotateSpite = function() {
							displacementSprite.rotation += 0.001;
							rafID = requestAnimationFrame( rotateSpite );
						};
	
					}	
					
					

					
				

				} // end effect
				
				
				
				
				//----------------------------------------------------------------------------------
				//--------------------------------- Liquid Distortion Effect 2 -----------------------
				//----------------------------------------------------------------------------------
				if ( slider.hasClass( 'eff-liquid2' ) ) {
					
				
					
					//Display wrapper of canvas (transitions between slides)
					//-------------------------------------	
					if ( goType == 'out' ) {
						//Current item leaving action
						
						TweenMax.to( displacementSprite.scale, 1, { 
							x: 10
						} );

						
					} else {
						//Current item entry action
						
						TweenMax.to( $myRenderer, animDuration/1000, {
							alpha : 0,
							onComplete    : function() {

								var curSp = items_container.children[ elementIndex ];

								TweenMax.to( this.target, animDuration/1000, {
									alpha : 1
								});	


								//display the current item
								for ( var k = 0; k < spTotal; k++ ) {

									var obj = items_container.children[ k ];
									TweenMax.set( obj, {
										alpha : 0
									});	

									//pause all videos
									if ( obj._texture.baseTexture.imageType == null ) {
										var videoSource = obj.texture.baseTexture.source;

										// play the video
										videoSource.currentTime = 0;
										videoSource.autoplay = false;
										videoSource.pause();
										videoSource.muted = true;
									}		

								}



								//play current video
								if ( curSp._texture.baseTexture.imageType == null ) {
									var videoSource2 = curSp.texture.baseTexture.source;

									// play the video
									videoSource2.currentTime = 0;
									videoSource2.autoplay = true;
									videoSource2.play();
									videoSource2.muted = false;
								}


								//display filters
								
								//sprite
								var baseTimeline = new TimelineMax( {
									delay       : 0,
									paused      : false,
									repeat      : 0,
									onRepeat    : function() {},
									onComplete  : function() {
										
										TweenMax.to( displacementSprite.scale, 1, { x: 1, y: 1 });   
										TweenMax.to( displacementSprite, 1, { rotation: 0 }); 
										
										

									},
									onUpdate    : function() {  
										displacementSprite.scale.set( baseTimeline.progress() * 13 );
										displacementSprite.rotation += baseTimeline.progress() * 0.02;
										
									}
								} );
								
								baseTimeline.clear();

								//filter
								baseTimeline
								  .to( displacementFilter.scale, 1, { y: "+=" + 200 + "", ease: Power3.easeOut } )
								  .to( curSp, 0.5, { alpha: 1, ease: Power3.easeOut }, 0.4 )     
								  .to( displacementFilter.scale, 1, { y: 0,  ease: Power3.easeOut }, 1 );      		

								
								

								

							}
						});		

						

						//Add new ripple each time mouse is clicked
						//-------------------------------------
						document.addEventListener("mousemove", function(e) {
					
							TweenMax.to( displacementFilter.scale, 1, { x: e.pageX/2 + "" });   
						});

	
					}	
					
					

					
				

				} // end effect
				
				

				//----------------------------------------------------------------------------------
				//--------------------------------- Liquid Distortion Effect 3 -----------------------
				//----------------------------------------------------------------------------------
				if ( slider.hasClass( 'eff-liquid3' ) ) {
					
				
					
					//Display wrapper of canvas (transitions between slides)
					//-------------------------------------	
					if ( goType == 'out' ) {
						//Current item leaving action
						
						
						TweenMax.to( displacementSprite, 1, { 
							x: 23,
							y: 10
						} );
						
						
					} else {
						//Current item entry action
						
						TweenMax.to( $myRenderer, animDuration/1000, {
							alpha : 0,
							onComplete    : function() {

								var curSp = items_container.children[ elementIndex ];

								TweenMax.to( this.target, animDuration/1000, {
									alpha : 1
								});	


								//display the current item
								for ( var k = 0; k < spTotal; k++ ) {

									var obj = items_container.children[ k ];
									TweenMax.set( obj, {
										alpha : 0
									});	

									//pause all videos
									if ( obj._texture.baseTexture.imageType == null ) {
										var videoSource = obj.texture.baseTexture.source;

										// play the video
										videoSource.currentTime = 0;
										videoSource.autoplay = false;
										videoSource.pause();
										videoSource.muted = true;
									}		

								}



								//play current video
								if ( curSp._texture.baseTexture.imageType == null ) {
									var videoSource2 = curSp.texture.baseTexture.source;

									// play the video
									videoSource2.currentTime = 0;
									videoSource2.autoplay = true;
									videoSource2.play();
									videoSource2.muted = false;
								}


								//display filters
								
								//sprite
								var baseTimeline = new TimelineMax( {
									delay       : 0,
									paused      : false,
									repeat      : 0,
									onRepeat    : function() {},
									onComplete  : function() {
							

									},
									onUpdate    : function() {  
									   
									}
								} );
								
								baseTimeline.clear();

								//filter
								baseTimeline
								  .to( displacementFilter.scale, 1, { y: "+=" + 50 + "", ease: Power3.easeOut } )
								  .to( curSp, 0.5, { alpha: 1, ease: Power3.easeOut }, 0.4 )     
								  .to( displacementFilter.scale, 1, { y: 0,  ease: Power3.easeOut }, 1 );  

								
								
								
								

								

							}
						});		

	
					}	
					
					

					
				

				} // end effect
				
				
				
				
				
				//----------------------------------------------------------------------------------
				//--------------------------------- 3D Rotating Effect -----------------------------
				//----------------------------------------------------------------------------------
				if ( slider.hasClass( 'eff-3d-rotating' ) ) {
					
					//Display wrapper of canvas (transitions between slides)
					//-------------------------------------	
					
					if ( goType == 'out' ) {
						//Current item leaving action
						
						
						//rotation transition
						TweenMax.to( scenesAll[ elementIndex ].children[ 0 ].rotation, animDuration/1000, {
							x: '+=2',
							y: '+=2'
						});	
						
						
	
					} else {
						//Current item entry action
						
						TweenMax.to( $myRenderer, animDuration/1000, {
							alpha : 0,
							onComplete    : function() {

								var curSp = $myRenderer.find( '.list-item' ).eq( elementIndex );

								TweenMax.to( this.target, animDuration/1000, {
									alpha : 1
								});


								//display the current item
								TweenMax.set( $myRenderer.find( '.list-item' ), {
									alpha: 0,
									css  : {
										display: 'none'
									}
								});	


								// pause all videos
								for ( var k = 0; k < spTotal; k++ ) {

									var videoOb = texturesAll[ k ].image;

									if ( videoOb.currentSrc.indexOf( '.mp4' ) >= 0 ) {
										videoOb.autoplay = false;
										videoOb.currentTime = 0;
										videoOb.muted = true;
										videoOb.pause();
									}

								}



								// play the video
								var videoObCur =  texturesAll[ elementIndex ].image;

								if ( videoObCur.currentSrc.indexOf( '.mp4' ) >= 0 ) {
									videoObCur.autoplay = true;
									videoObCur.currentTime = 0;
									videoObCur.muted = false;
									videoObCur.play();
								}



								//display filters
								TweenMax.to( curSp, animDuration/1000, {
									alpha: 1,
									css : {
										display: 'block'
									}
								});	


							}
						});			

						
					}



					

				}// end effect
					
				
				
				
			} else {
				slider.find( '.item canvas' ).hide();
			}
	
			
		}

		
		/*
		 * Initialize embedded local video.
		 *
		 * @param  {object} wrapper          - The outermost video container, which can contain multiple videos
		 * @param  {boolean} play            - Forced to trigger pause or play events.
		 * @return {void}                    - The constructor.
		 */
		function normalSliderVideoInit( wrapper, play ) {
			wrapper.find( '.slider-video-embed' ).each( function()  {
				var $this          = $( this ),
					videoWrapperW  = $this.closest( '.custom-advanced-slider-outer' ).width(),
					videoWrapperH  = $this.closest( '.custom-advanced-slider-outer' ).height(),
					tempID         = 'video-' + Math.random()*1000000000000000000,
					curVideoID     = tempID,
					coverPlayBtnID = 'videocover-' + curVideoID,
					dataControls   = $this.data( 'embed-video-controls' ),
					dataAuto       = $this.data( 'embed-video-autoplay' ),
					dataLoop       = $this.data( 'embed-video-loop' ),
					dataW          = $this.data( 'embed-video-width' ),
					dataH          = $this.data( 'embed-video-height' ),
					$replayBtn     = $( '#'+curVideoID+'-replay-btn' );
				
				
				//Push a new ID to video
				//Solve the problem that ajax asynchronous loading does not play
				$this.find( '.video-js' ).attr( 'id', tempID );

				
				if ( videoWrapperH == 0 ) videoWrapperH = videoWrapperW/1.77777777777778;

			
				if( typeof dataAuto === typeof undefined ) {
					dataAuto = true;
				}
				if( typeof dataLoop === typeof undefined ) {
					dataLoop = true;
				}
				

				if( typeof dataControls === typeof undefined ) {
					dataControls = false;
				}	
				
				if( typeof dataW === typeof undefined || dataW == 'auto' ) {
					dataW = videoWrapperW;
				}	

				if( typeof dataH === typeof undefined || dataH == 'auto' ) {
					dataH = videoWrapperH;
				}

				

				//Display cover and play buttons when some mobile device browsers cannot automatically play video
				if ( $( '#' + coverPlayBtnID ).length == 0 ) {
					$( '<div id="'+coverPlayBtnID+'" class="web-video-embed-cover"><span class="cover-show" style="background-image:url('+$this.find( 'video' ).attr( 'poster' )+')"></span><span class="cover-play"></span></div>' ).insertBefore( $this );


					var btnEv = ( Modernizr.touchevents ) ? 'touchstart' : 'click';
					$( '#' + coverPlayBtnID + ' .cover-play' ).on( btnEv, function( e ) {
						e.preventDefault();

						myPlayer.play();

						$( '#' + coverPlayBtnID ).hide();

					});

				}
				
				
				//Add replay button to video 
				if ( $replayBtn.length == 0 ) {
					$this.after( '<span class="web-video-replay" id="'+curVideoID+'-replay-btn"></span>' );
				}
				
				
				//HTML5 video autoplay on mobile revisited
				if ( dataAuto && windowWidth <= 768 ) {
					$this.find( '.video-js' ).attr({
						'autoplay'    : 'true',
						'muted'       : 'true',
						'playsinline' : 'true'
					});
				}

				var myPlayer = videojs( curVideoID, {
										  width     : dataW,
										  height    : dataH,
										  loop      : dataLoop,
										  controlBar: {
											  muteToggle : false,
											  autoplay   : dataAuto,
											  loop       : dataLoop,
											  controls   : true,
											  controlBar : {
												  muteToggle: false
											  }
										  }


										});


				
				
				myPlayer.ready(function() {
					
					
					/* ---------  Video initialize */
					myPlayer.on( 'loadedmetadata', function() {

						//Get Video Dimensions
						var curW    = this.videoWidth(),
							curH    = this.videoHeight(),
							newW    = curW,
							newH    = curH;

						newW = videoWrapperW;

						//Scaled/Proportional Content 
						newH = curH*(newW/curW);


						if ( !isNaN( newW ) && !isNaN( newH ) )  {
							myPlayer
								.width( newW )
								.height( newH );	
							
							$this.css( 'height', newH );
						}



						//Show this video wrapper
						$this.css( 'visibility', 'visible' );

						//Hide loading effect
						$this.find( '.vjs-loading-spinner, .vjs-big-play-button' ).hide();

					});		

		
				
					/* ---------  Set, tell the player it's in fullscreen  */
					if ( dataAuto ) {
						myPlayer.play();
					}


					/* ---------  Disable control bar play button click */
					if ( !dataControls ) {
						myPlayer.controls( false );
					}
					
					
					/* ---------  Determine if the video is auto played from mobile devices  */
					var autoPlayOK = false;

					myPlayer.on( 'timeupdate', function() {

						var duration = this.duration();
						if ( duration > 0 ) {
							autoPlayOK = true;
							if ( this.currentTime() > 0 ) {
								autoPlayOK = true;
								this.off( 'timeupdate' );

								//Hide cover and play buttons when the video automatically played
								$( '#' + coverPlayBtnID ).hide();
							} 

						}

					});
				

					
					/* ---------  Pause the video when it is not current slider  */
					if ( !play ) {
						myPlayer.pause();
						myPlayer.currentTime(0);
						
					} else {
						if ( dataAuto ) {

							myPlayer.currentTime(0);
							myPlayer.play();
							$replayBtn.hide();

							//Should the video go to the beginning when it ends
							myPlayer.on( 'ended', function () { 
								
								if ( dataLoop ) {
									myPlayer.currentTime(0);
									myPlayer.play();	
								} else {
									//Replay this video
									myPlayer.currentTime(0);
									
									$replayBtn
										.show()
										.off( 'click' )
										.on( 'click', function( e ) {
											e.preventDefault();

											myPlayer.play();
											$replayBtn.hide();

										});						
								}
							
							});		


						}	
					}
					

				});

			});	
		}	    
		
    };

    APP.components.pageLoaded.push( APP.ADVANCED_SLIDER_FILTER.pageLoaded );
    return APP;

}( APP, jQuery, window, document ) );



