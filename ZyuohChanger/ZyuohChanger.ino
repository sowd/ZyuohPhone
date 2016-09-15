int numLog[12] ;
boolean bOpen ;
boolean bDialMode ;


void setup() {
  Serial.begin(9600);
  pinMode(0, INPUT_PULLUP);

  pinMode(1, INPUT_PULLUP);
  pinMode(2, INPUT_PULLUP);
  pinMode(3, INPUT_PULLUP);
  pinMode(4, INPUT_PULLUP);

  pinMode(5, INPUT_PULLUP);

  for( int i=0;i<12;++i )
    numLog[i]=0 ;

    bOpen = false ;
    bDialMode = true ;
}

// In: A1,D0,D5
char prnArray[12] = { '-','+','0','1','2','3','4','5','6','7','8','9'} ;
int waitcount = 0 ;
unsigned long prevPrintTime = 0 ;


char gcacm = 0 ;
void loop(){
  if( !bOpen ){
    // Closed.
    // Go 'called' mode when opened (otherwise, go to 'dial' mode)
    int sn = Bean.readScratchNumber(1) ;
    if( sn == 1 ){
      Bean.setScratchNumber(1, 0);
      bDialMode = false ;
    } else if( sn == 2 ){
      Bean.setScratchNumber(1, 0);
      bDialMode = true ;
    }
    // Opened
    if( analogRead(A0) >= 512 ){
      if( bDialMode ){ Serial.write('O') ;}
      else{            Serial.write('o') ;}

      bOpen = true ;
    }
  } else {
    if( !bDialMode ){
      // Close only mode.
      if( analogRead(A0) < 512 ){
        bOpen = false ;
        bDialMode = true ;  // Reset dial mode for next case
        Serial.write('c') ;
      }
    } else {
      char c = getCode() ;
      if( c != 0 ){
        if( (gcacm==0 && c!='0') || (gcacm==1 && ( c == '0' || c=='+')) ){
          gcacm = 0 ;
        } else {
          ++gcacm ;
          if( gcacm==2 ){
            Serial.write('0') ;
            Bean.sleep(300) ;
            Serial.write(c) ;
            stopSound() ;
          } else if( gcacm > 2 ){
            Serial.write(c) ;
            if( c == '+' ){
              stopSound() ;
              gcacm = 0 ;
              bDialMode = false ;
            }
          }
        }
      }
     }
    }
}
void stopSound(){
  Bean.sleep(300);
  analogWrite(A0,0) ;
  Bean.sleep(500);
  analogWrite(A0,1023) ;
  Bean.sleep(500);
  analogRead(A0) ;
}

char getCode(){
    int x = -1 ;
  if( digitalRead(2) == LOW )    x = 0 ;
  else if( digitalRead(0) == LOW ) x = 1 ;
  else if( digitalRead(5) == LOW ) x = 2 ;

  if( x != -1 ){
    int y = -1 ;
    if( digitalRead(3) == LOW )         y=0 ;
    else if( digitalRead(4) == LOW )    y=1 ;
    else if( digitalRead(1) == LOW )    y=2 ;
    else if( analogRead(A1)<511 )    y=3 ;

      
    if( y != -1 && y*3+x != 0){
      //Serial.print( prnArray[y*3+x] ) ;
      waitcount = 1000 ;
      ++numLog[y*3+x] ;
    }
  }

  if( waitcount>0 && --waitcount == 0 ){
    int maxid  ,maxnum = -1 ;
    for( int i=0;i<12;++i ){
      if( numLog[i]>maxnum ){
        maxid=i ;
        maxnum = numLog[i] ;
      }
      numLog[i]=0 ;
    }
    if( millis() - prevPrintTime > 500 ){
      prevPrintTime = millis() ;
      return prnArray[maxid] ;
    }
  }

  return 0 ;
}

