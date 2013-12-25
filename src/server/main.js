var io = require('socket.io').listen(443);
io.set('log level', 1);
var channels = [
	
];

var rooms = []; // each link has a unique room. Array content is an object of int # of rooms where sound is loaded, int maxLatency (ms)

io.sockets.on( 'connection', function( socket ) {
	
	var channel = 0;
	
	var currentRoom = false; // the room this user is in. Gets set in joinRoom or generateLink
	
	socket.latency;
	socket.timeOffset; // the offset between server time and client time so we can make sure the sound gets called at a more specific time (in case the last send takes longer/shorter than expected)
	
	// Ping the client 5 times to get average latency 
	var pings = 0;
	var MAX_PINGS = 5;
	socket.latency = 0;
	function sendPing()
	{
		var pingStart = Date.now();
		socket.emit( 'ping' );
		socket.on( 'ping', function( time ) {
			// See how long the round-trip took and store that (divided by two) as our latency
			socket.latency = ( socket.latency * pings + ( Date.now() - pingStart ) / 2 ) / ( pings + 1 ); // get new avg
			//console.log( socket.latency );
			if( currentRoom !== false && rooms[ currentRoom ] && socket.latency > rooms[ currentRoom ][ 1 ] ) // check if our latency is the max of anyone in room
				rooms[ currentRoom ][ 1 ] = socket.latency;
			
			if( pings < MAX_PINGS )
				sendPing();
			else
				socket.timeOffset = Date.now() - time - Math.round( socket.latency );
				
			pings++;
		} );
	}
	sendPing();
	
	// TODO: remove
	socket.on( 'reload', function() {
		io.sockets.emit( 'reload' );
	} );
	
	socket.on( 'joinRoom', function( room ) {
		currentRoom = room;
		socket.join( currentRoom );
		if( rooms[ currentRoom ] && socket.latency > rooms[ currentRoom ][ 1 ] ) // check if our latency is the max of anyone in room
			rooms[ currentRoom ][ 1 ] = socket.latency;
	} );
	
	socket.on( 'generateLink', function () {
		currentRoom = rooms.push( [ 0, 0 ] ) - 1; // [ rooms with sound loaded, max latency ]
		socket.join( currentRoom );
		if( socket.latency > rooms[ currentRoom ][ 1 ] ) // check if our latency is the max of anyone in room
			rooms[ currentRoom ][ 1 ] = socket.latency;
		socket.emit( 'linkGenerated', currentRoom );
	} );
	
	socket.on( 'roomReady', function( webAudio ) {
		socket.webAudio = webAudio; // mark if the client is using webaudio
		
		var clientsInRoom = io.sockets.clients( currentRoom );
		
		if( clientsInRoom.length === 1 ) // not enough devices, do multiple channels per device
		{
			clientsInRoom[ 0 ].emit( 'roomReady', [ 0, 1, 2, 3 ] );
		}
		else
		{
			for( var i = 0, j = clientsInRoom.length; i < j; i++ )
			{
				var channels = [ i % 4 ]; // TODO: allow multiple channels
				// Notify client that all clients are ready, and have the client load up their sound file
				clientsInRoom[ i ].emit( 'roomReady', channels );
			}
		}
	} );
	
	socket.on( 'soundsReady', function() {
		if( ! rooms[ currentRoom ] ) return false;
		
		rooms[ currentRoom ][ 0 ]++; // increment that this room is ready
		//console.log( rooms[ currentRoom ] );
		// Check if all sounds are ready. # of ready clients is stored as value in rooms array
		if( rooms[ currentRoom ][ 0 ] == io.sockets.clients( currentRoom ).length )
		{
			var clientsInRoom = io.sockets.clients( currentRoom );
			for( var i = 0, j = clientsInRoom.length; i < j; i++ )
			{
				var client = clientsInRoom[ i ];
				var waitTime = Math.round( rooms[ currentRoom ][ 1 ] - client.latency ); // max latency - our latency
				
				console.log( rooms[ currentRoom ][ 1 ] + ':' + client.latency + ':' + waitTime );
				
				// Tack on an extra 75ms for iOS to play. Not sure why I'm having to do this
				//if( userAgent.indexOf( 'Mobile' ) !== -1 && userAgent.indexOf( 'Safari' ) !== -1 )
				//	waitTime += 100;
				
				console.log( client.webAudio );
				//if( client.webAudio )
				//	waitTime += 100;
				
				executeTime = ( Date.now() - client.timeOffset ) + waitTime;
				client.emit( 'soundsReady', executeTime );
			}
		}
	} );
});