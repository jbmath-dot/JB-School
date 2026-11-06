package kr.jbmath.classmanager;

import android.app.Activity;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.graphics.Rect;
import android.util.Base64;
import android.webkit.*;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class MainActivity extends Activity {
  private static final String HOST="https://appassets.androidplatform.net";
  private static final int GALLERY=101,CAMERA=102,FILE=103,SAVE=104;
  private WebView web;
  private ValueCallback<Uri[]> upload;
  private Uri photoUri;
  private File captured;
  private byte[] bytesToSave;
  private TextRecognizer recognizer;

  @Override public void onCreate(Bundle b) {
    super.onCreate(b);
    web=new WebView(this);
    setContentView(web);
    WebSettings s=web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(true);
    s.setAllowFileAccessFromFileURLs(false);
    s.setAllowUniversalAccessFromFileURLs(false);
    s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    s.setJavaScriptCanOpenWindowsAutomatically(false);
    CookieManager.getInstance().setAcceptCookie(false);
    CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
    web.addJavascriptInterface(new LocalBridge(),"AndroidApp");
    web.setWebViewClient(new WebViewClient(){
      @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r) {
        Uri u=r.getUrl();
        return !HOST.equals(u.getScheme()+"://"+u.getAuthority());
      }
      @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r) {
        Uri u=r.getUrl(),dummy=null;
        if(!HOST.equals(u.getScheme()+"://"+u.getAuthority()))return deny();
        String path=u.getPath(),name=path!=null&&path.startsWith("/assets/")?path.substring(8):"";
        if(!Arrays.asList("index.html","seat.html","attendance.html").contains(name))return deny();
        try{
          WebResourceResponse response=new WebResourceResponse("text/html","utf-8",getAssets().open(name));
          response.setResponseHeaders(Collections.singletonMap("Cache-Control","no-store"));
          return response;
        }catch(IOException e){return deny();}
      }
    });
    web.setWebChromeClient(new WebChromeClient(){
      @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params) {
        if(upload!=null)upload.onReceiveValue(null);
        upload=callback;
        Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType("application/json");
        i.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"application/json","text/plain","application/octet-stream"});
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try{startActivityForResult(i,FILE);return true;}catch(Exception e){upload=null;return false;}
      }
      @Override public void onPermissionRequest(PermissionRequest request){request.deny();}
    });
    if(b==null)web.loadUrl(HOST+"/assets/index.html");else web.restoreState(b);
  }

  private WebResourceResponse deny(){
    return new WebResourceResponse("text/plain","utf-8",403,"Forbidden",
      Collections.singletonMap("Cache-Control","no-store"),
      new ByteArrayInputStream(new byte[0]));
  }

  private class LocalBridge {
    @JavascriptInterface public void pickRosterPhoto(String which) {
      runOnUiThread(()->{if("camera".equals(which))capturePhoto();else selectPhoto();});
    }
    @JavascriptInterface public void saveTextFile(String filename,String mime,String content) {
      byte[] data=content.getBytes(StandardCharsets.UTF_8);
      runOnUiThread(()->saveFile(filename,mime,data));
    }
    @JavascriptInterface public void saveImageFile(String filename,String data64) {
      try {byte[] data=Base64.decode(data64,Base64.DEFAULT);
        runOnUiThread(()->saveFile(filename,"image/png",data));
      } catch(IllegalArgumentException e){notifyUser("이미지 형식 오류");}
    }
  }

  private void selectPhoto() {
    Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);
    i.setType("image/*");i.addCategory(Intent.CATEGORY_OPENABLE);
    i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
    try{startActivityForResult(i,GALLERY);}catch(Exception e){ocrResult("","사진 선택을 시작하지 못했습니다.");}
  }

  private void capturePhoto() {
    try {
      captured=File.createTempFile("class_roster_",".jpg",getCacheDir());
      photoUri=FileProvider.getUriForFile(this,getPackageName()+".provider",captured);
      Intent i=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
      i.putExtra(MediaStore.EXTRA_OUTPUT,photoUri);
      i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
      startActivityForResult(i,CAMERA);
    } catch(Exception e){discardPhoto();ocrResult("","카메라를 시작하지 못했습니다.");}
  }

  private void saveFile(String filename,String mime,byte[] data) {
    if(bytesToSave!=null){notifyUser("이전 저장을 먼저 완료해 주세요.");return;}
    bytesToSave=data;
    Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);
    i.addCategory(Intent.CATEGORY_OPENABLE);
    i.setType(mime!=null&&mime.length()>0?mime:"application/octet-stream");
    i.putExtra(Intent.EXTRA_TITLE,filename.replaceAll("[\\\\/:*?\"<>|]","_"));
    try{startActivityForResult(i,SAVE);}
    catch(Exception e){bytesToSave=null;notifyUser("파일 저장 앱이 없습니다.");}
  }

  @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
    super.onActivityResult(requestCode,resultCode,data);
    if(requestCode==FILE){
      if(upload!=null){upload.onReceiveValue(resultCode==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);upload=null;}
      return;
    }
    if(requestCode==SAVE){
      byte[] out=bytesToSave;bytesToSave=null;
      if(resultCode==RESULT_OK&&data!=null&&data.getData()!=null&&out!=null)
        try(OutputStream os=getContentResolver().openOutputStream(data.getData())){
          if(os==null)throw new IOException("저장소 접근 실패");
          os.write(out);notifyUser("저장했습니다.");
        }catch(Exception e){notifyUser("파일 저장 실패: "+e.getMessage());}
      return;
    }
    if(requestCode==GALLERY||requestCode==CAMERA){
      if(resultCode!=RESULT_OK){discardPhoto();return;}
      Uri uri=requestCode==CAMERA?photoUri:data!=null?data.getData():null;
      if(uri==null){ocrResult("","사진 주소를 확인할 수 없습니다.");return;}
      recognize(uri);
    }
  }

  private void recognize(Uri uri){
    try {
      InputImage img=InputImage.fromFilePath(this,uri);
      if(recognizer==null)recognizer=TextRecognition.getClient(new KoreanTextRecognizerOptions.Builder().build());
      recognizer.process(img)
        .addOnSuccessListener(result->{String text=layoutText(result);ocrResult(text,text.isEmpty()?"사진에서 문자를 찾지 못했습니다.":"");discardPhoto();})
        .addOnFailureListener(e->{ocrResult("",e.getLocalizedMessage());discardPhoto();});
    } catch(Exception e){ocrResult("",e.getLocalizedMessage());discardPhoto();}
  }

  private static class Line {
    final int x,y,h;final String text;
    Line(String text,Rect r){this.text=text;x=r==null?0:r.left;y=r==null?0:r.centerY();h=r==null?15:r.height();}
  }
  private String layoutText(Text recognition){
    List<Line> list=new ArrayList<>();
    for(Text.TextBlock block:recognition.getTextBlocks())
      for(Text.Line l:block.getLines())if(!l.getText().trim().isEmpty())list.add(new Line(l.getText().trim(),l.getBoundingBox()));
    list.sort(Comparator.comparingInt((Line l)->l.y).thenComparingInt(l->l.x));
    List<List<Line>> rows=new ArrayList<>();
    for(Line l:list){
      if(rows.isEmpty()){List<Line> a=new ArrayList<>();a.add(l);rows.add(a);continue;}
      List<Line> last=rows.get(rows.size()-1);
      if(Math.abs(last.get(0).y-l.y)<=Math.max(7,Math.min(last.get(0).h,l.h)/2))last.add(l);
      else {List<Line> a=new ArrayList<>();a.add(l);rows.add(a);}
    }
    StringBuilder s=new StringBuilder();
    for(List<Line> r:rows){
      r.sort(Comparator.comparingInt(l->l.x));
      if(s.length()>0)s.append('\n');
      for(int i=0;i<r.size();i++){if(i>0)s.append('\t');s.append(r.get(i).text);}
    }
    return s.toString();
  }
  private void ocrResult(String text,String error){
    String js="window.receiveRosterOcr("+JSONObject.quote(text)+","+JSONObject.quote(error)+");";
    runOnUiThread(()->{if(web!=null)web.evaluateJavascript(js,null);});
  }
  private void notifyUser(String value){runOnUiThread(()->Toast.makeText(this,value,Toast.LENGTH_SHORT).show());}
  private void discardPhoto(){if(captured!=null){captured.delete();captured=null;photoUri=null;}}
  @Override public void onSaveInstanceState(Bundle b){web.saveState(b);super.onSaveInstanceState(b);}
  @Override protected void onDestroy(){if(recognizer!=null)recognizer.close();super.onDestroy();}
}