QUnit.test( "Hello Test", function( assert ) {
  assert.ok( 1 == "1", "Dummy Test" );
});

//GUID Unit Test, Tests to RFC 4122 version 4 with caps and lowercase
// Does not check to see if there is any extra cruft
QUnit.test( "GUID Test", function( assert ) {
  var re = /[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}/; 
  for (i = 0; i < 10; i++) { 
    var testGuid = Guid()
    assert.ok( re.exec(testGuid) !== null, "Test GUID: "+testGuid );
  }
});