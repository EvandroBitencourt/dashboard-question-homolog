import Quizzes from "@/app/components/Quizzes";

const Home = () => {
  return (
    <main className="pt-[30px] sm:pl-[190px]">
      <div className="max-w-screen-xl mx-auto px-4">
        <Quizzes />
      </div>
    </main>
  );
};

export default Home;
