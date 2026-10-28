package org.forma.wellness;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle state) {
    registerPlugin(WellnessPlugin.class);
    super.onCreate(state);
  }
}
