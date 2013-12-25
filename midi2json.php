<?php
$xml = new SimpleXMLElement( file_get_contents( 'audio/channel' . $_GET['channel'] . '.xml' ) );
$times = array();
$usedTimes = array();
foreach( $xml as $tracks => $events )
{
	foreach( $events as $key => $event)
	{
		if( $event->Absolute && $event->NoteOn )
		{
			$time = (int) $event->Absolute;
			if( ! in_array( $time, $usedTimes ) )
			{
				$usedTimes[] = $time;
				$times[] = array( 'time' => $time, 'note' => (int) $event->NoteOn->attributes()->Note );
			}
		}
	}
}

echo json_encode( $times );
?>