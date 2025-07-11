import Quizzes from "@/app/components/Quizzes";

const Home = () => {
  return (
    <main className="pt-[80px] sm:pl-[190px]">
      <div className="max-w-screen-xl mx-auto p-4">
        <Quizzes />
      </div>
    </main>
  );
};

export default Home;
