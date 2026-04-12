import java.util.Arrays;

/** 用于验证应用内「JAR 运行」：打印 JVM 传入的 main 参数。 */
public class EchoArgs {
  public static void main(String[] args) {
    System.out.println(args);
    System.out.println(Arrays.toString(args));
    for (int i = 0; i < args.length; i++) {
      System.out.println("arg[" + i + "] = " + args[i]);
    }
  }
}
