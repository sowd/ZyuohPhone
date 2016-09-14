// Thank you jakalada!  (http://qiita.com/jakalada/items/7ad4144efa2f5e109b89)

var beanSerialServiceUuid		= 'a495ff10c5b14b44b5121370f02d74de';
var beanTransportCharacteristicUuid	= 'a495ff11c5b14b44b5121370f02d74de';

var beanScratch1ServiceUuid		= 'a495ff20c5b14b44b5121370f02d74de' ;
var beanScratch1CharacteristicUuid	= 'a495ff21c5b14b44b5121370f02d74de' ;

// Read setting data from external config file
var ENV = require('./env.js') ;

// BLE library
var noble = require('noble');

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    console.log('scanning...');
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});

// Peripheral found
noble.on('discover', function(peripheral) {
  console.log('Peripheral with local name "'+peripheral.advertisement.localName+'" found. (id='+peripheral.id+')') ;
  if( peripheral.advertisement.localName === 'ZyuohChanger' ){
    // ZPhone found. stop scanning
    noble.stopScanning();
    //console.log('peripheral with ID ' + peripheral.id + ' found');

    peripheral.once('disconnect', function() {
      console.log('disconnected');
      process.exit(0);
    });

    // start connection
    peripheral.connect(function(error) {
      console.log('connected');
      // Find services
      peripheral.discoverServices([], onServicesDiscovered);
    });
  }
});

// Services found.
function onServicesDiscovered(error, services) {
  console.log('services discovered');

  services.forEach(function(service) {
    if (service.uuid == beanSerialServiceUuid || service.uuid == beanScratch1ServiceUuid ) {
      // Find characteristics
      service.discoverCharacteristics([], onCharacteristicDiscovered);
    }
  });
}


// keep characteristic for Scrach 1 interface for future writing
var scr1chara ;

//Characteristics found.
function onCharacteristicDiscovered(error, characteristics) {
  console.log('characteristics discovered');

  characteristics.forEach(function(characteristic) {

    if (characteristic.uuid == beanTransportCharacteristicUuid) {
      console.log('Bean Transport Characteristic found!');
      characteristic.on('read', onBeanTransportCharacteristicRead);
      characteristic.notify(true,function(error){
        console.log('onBeanTransportCharacteristicRead notification on');
      }) ;

    } else if (characteristic.uuid == beanScratch1CharacteristicUuid){
      console.log('Bean Scratch1 Characteristic found!');
      scr1chara = characteristic ;
    }
  });
}

function onBeanTransportCharacteristicRead(data, isNotication) {
  onZPhoneAction( String.fromCharCode(data.readInt8(5)) ) ;
}



var childProcess = require('child_process');

// http://stackoverflow.com/questions/27325910/node-spawn-stdout-on-data-delay
var p = childProcess.spawn("stdbuf",
	[
	'-oL','-eL'
	,ENV.PJSUA_PATH
	,'--id=sip:'+ENV.USER_NAME+'@'+ENV.ASTERISK_ADDR
	,'--registrar=sip:'+ENV.ASTERISK_ADDR
	,'--realm=*'
	,'--username='+ENV.USER_NAME
	,'--password='+ENV.USER_PASSWD
	] , { stdio: 'pipe' }
);

p.on('exit', function (code) {
    console.log('child process exited.');
});

p.on('error', function (err) {
    console.error(err);
    process.exit(1);
});

p.stdout.on('data',function(data){
	onSipMessage(data.toString()) ;
}) ;








var MODE_WAITING = 0 ;
var MODE_CALLED_WAITING_FOR_OPEN = 1 ;
var MODE_TALKING = 2 ;
var MODE_DIALING = 3 ;
var MODE_CALLING = 4 ;

var mode = MODE_WAITING ;
var pushed_num = '' ;


// Data received handlers (Main logic)

function onSipMessage(msg){
        console.log('STDOUT>>>>>>>>>>>>>>'+msg);
        if( msg.indexOf('Press a to answer or h to reject call')>=0 ){
                console.log('>>>>>>Phone call!') ;
		mode = MODE_CALLED_WAITING_FOR_OPEN ;
                // Change zphone to 'Pick only' mode
		if( scr1chara != undefined )
	                scr1chara.write(new Buffer([1]), true, (e)=>{});
        } else if ( msg.indexOf('is DISCONNECTED [reason=487 (Request Terminated)]') >= 0 ){
                console.log('>>>>>>Phone call canceled') ;
		mode = MODE_WAITING ;
                // Cancel 'Pick only' mode
		if( scr1chara != undefined )
	                scr1chara.write(new Buffer([2]), true, (e)=>{});
	} else if ( msg.indexOf('is DISCONNECTED [reason=486 (Busy here)]')>=0
		 || msg.indexOf('is DISCONNECTED [reason=603 (Declined)]')>=0 ){
		// Called and disconnected
		// mode == MODE_CALLING
		mode = MODE_WAITING ;	// Close only.
		console.log('Call was not accepted. Close the phone.') ;
	} else if ( msg.indexOf('state changed to CONFIRMED') ){
		mode = MODE_TALKING ;
	}
}


function onZPhoneAction(push){
  console.log('ZPHONE>>>>>>>>>>'+push) ;

  switch( push ){
  case '+' :
        callPhone() ;
        break ;
  case 'c' :    // closed
        if( mode == MODE_TALKING ){
		p.stdin.write("h\n") ;
        }
	mode = MODE_WAITING ;

        break ;
  case 'o' :    // open with 'Pick only' mode. close only.
        if( mode == MODE_CALLED_WAITING_FOR_OPEN ){
		console.log('Answering.') ;
		p.stdin.write("a\n200\n") ;
		mode = MODE_TALKING ;
	}
        pushed_num = '' ;
        break ;
  case 'O' :    // Push num
	mode = MODE_DIALING ;
        pushed_num = '' ;
        break ;
  default :
        pushed_num += push ;
  }

}






function callPhone(){
	if( pushed_num.length==0 ) return ;
	mode = MODE_CALLING ;
	console.log('Calling:'+pushed_num) ;
	p.stdin.write("m\nsip:"+pushed_num+"@"+ENV.ASTERISK_ADDR+"\n") ;
}
