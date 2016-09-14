
int numLog[12] ;

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
}
// In: A1,D0,D5
char prnArray[12] = {'X','0','Y','1','2','3','4','5','6','7','8','9'} ;

int waitcount = 0 ;

unsigned long prevPrintTime = 0 ;

void loop() {
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

      
    if( y != -1 ){
      waitcount = 5000 ;
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
      Serial.print(prnArray[maxid]) ;
      prevPrintTime = millis() ;
    }
  }


}
