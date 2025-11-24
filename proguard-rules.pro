-dontshrink
-dontoptimize

-dontnote
-dontwarn javafx.**
-dontwarn com.sun.**
-dontwarn **
-ignorewarnings
-keepattributes Exceptions,InnerClasses,Signature,Deprecated,SourceFile,LineNumberTable,RuntimeVisibleAnnotations,RuntimeInvisibleAnnotations,RuntimeVisibleParameterAnnotations,RuntimeInvisibleParameterAnnotations,RuntimeVisibleTypeAnnotations,RuntimeInvisibleTypeAnnotations,EnclosingMethod,LocalVariableTable,LocalVariableTypeTable

-keep class com.airbamin.desktop.Main {
    public static void main(java.lang.String[]);
    public void start(javafx.stage.Stage);
}

-keep class com.airbamin.desktop.Launcher {
    public static void main(java.lang.String[]);
}

# Preserve JavaFX controllers and their members (FXML reflection)
-keep class com.airbamin.desktop.ui.** { *; }

# Preserve storage methods/fields used via Gson/reflection
-keep class com.airbamin.desktop.storage.** { *; }

# Preserve utility classes that may be reflected/logged
-keep class com.airbamin.desktop.utils.** { *; }

# Preserve network/api layer signatures for clarity in stack traces
-keep class com.airbamin.desktop.api.** { *; }

# Preserve transfer/server classes’ public API
-keep class com.airbamin.desktop.transfer.** { *; }
